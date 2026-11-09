import { createServer } from "node:http";
import express from "express";
import { Server, type Socket } from "socket.io";
import type { ClientMessage, ServerMessage } from "@arena/shared";
import { addPoint, advanceGame, createNextRound, TICK_RATE, TICK_SECONDS, WINNING_SCORE } from "./game-engine.js";
import { log } from "./logger.js";
import { RoomManager } from "./rooms.js";
import { clientMessageSchema } from "./schemas.js";

interface ClientToServerEvents {
  message: (payload: unknown) => void;
}

interface ServerToClientEvents {
  message: (payload: ServerMessage) => void;
}

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: true, credentials: false },
  transports: ["websocket"],
});
const rooms = new RoomManager();
const ROUND_PAUSE_MS = 1_000;

function emitToSocket(socket: Socket<ClientToServerEvents, ServerToClientEvents>, message: ServerMessage): void {
  socket.emit("message", message);
}

function emitRoomsList(): void {
  io.emit("message", { type: "ROOMS_LIST", rooms: rooms.listPublicRooms() });
}

function broadcastGameState(roomCode: string): void {
  const room = [...rooms.activeRooms()].find((candidate) => candidate.code === roomCode);
  if (!room) return;
  io.to(room.code).emit("message", {
    type: "GAME_STATE",
    roomCode: room.code,
    version: room.version,
    status: room.status,
    paddles: room.game.paddles,
    ball: { x: room.game.ball.x, y: room.game.ball.y, radius: room.game.ball.radius },
    score: room.game.score,
    sessionScore: room.sessionScore,
    winner: room.winner,
    players: { playerOne: room.playerOneName, playerTwo: room.playerTwoName },
  });
}

function sendError(socket: Socket<ClientToServerEvents, ServerToClientEvents>, code: string, message: string): void {
  emitToSocket(socket, { type: "ERROR", code, message });
  log("command_rejected", { socketId: socket.id, code, message });
}

function leaveCurrentRoom(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
  const membership = rooms.getMembership(socket.id);
  if (!membership) return;
  socket.leave(membership.room.code);
  const removal = rooms.removeSocket(socket.id);
  if (removal?.wasPlayer && !removal.roomDeleted) {
    io.to(removal.room.code).emit("message", {
      type: "OPPONENT_DISCONNECTED",
      roomCode: removal.room.code,
      message: removal.wasInProgress ? "Oponente desistiu da partida." : "Oponente saiu da sala.",
    });
    broadcastGameState(removal.room.code);
  }
}

function joinRoom(socket: Socket<ClientToServerEvents, ServerToClientEvents>, username: string, roomCode?: string): void {
  leaveCurrentRoom(socket);
  const membership = roomCode ? rooms.joinRoom(socket.id, roomCode, username) : rooms.createRoom(socket.id, username);
  if (!membership) {
    sendError(socket, "ROOM_NOT_FOUND", "A sala informada não existe.");
    return;
  }

  socket.join(membership.room.code);
  emitToSocket(socket, { type: "ROLE_ASSIGNED", roomCode: membership.room.code, role: membership.role });
  log(roomCode ? "room_joined" : "room_created", {
    socketId: socket.id,
    roomCode: membership.room.code,
    role: membership.role,
  });
  if (rooms.startMatchIfReady(membership.room)) {
    log("match_started", { roomCode: membership.room.code });
    broadcastGameState(membership.room.code);
  } else if (membership.room.status !== "WAITING") {
    broadcastGameState(membership.room.code);
  }
  emitRoomsList();
}

function handleMessage(socket: Socket<ClientToServerEvents, ServerToClientEvents>, rawPayload: unknown): void {
  const parsed = clientMessageSchema.safeParse(rawPayload);
  if (!parsed.success) {
    sendError(socket, "INVALID_PAYLOAD", "Mensagem inválida.");
    return;
  }

  const message: ClientMessage = parsed.data;
  switch (message.type) {
    case "CREATE_ROOM":
      joinRoom(socket, message.username);
      return;
    case "JOIN_ROOM":
      joinRoom(socket, message.username, message.roomCode);
      return;
    case "LIST_ROOMS":
      emitToSocket(socket, { type: "ROOMS_LIST", rooms: rooms.listPublicRooms() });
      return;
    case "INPUT": {
      const membership = rooms.getMembership(socket.id);
      if (!membership) return sendError(socket, "NOT_IN_ROOM", "Entre em uma sala antes de enviar comandos.");
      if (membership.role === "SPECTATOR") return sendError(socket, "SPECTATOR_INPUT", "Espectadores não podem controlar raquetes.");
      if (membership.room.status !== "PLAYING") return sendError(socket, "MATCH_NOT_PLAYING", "A partida não está em andamento.");

      if (membership.role === "PLAYER_ONE") membership.room.inputs.playerOne = message.direction;
      if (membership.role === "PLAYER_TWO") membership.room.inputs.playerTwo = message.direction;
      emitToSocket(socket, { type: "INPUT_ACCEPTED", direction: message.direction });
      log("command_accepted", { socketId: socket.id, roomCode: membership.room.code, direction: message.direction });
      return;
    }
    case "REQUEST_REMATCH": {
      const membership = rooms.getMembership(socket.id);
      if (!membership) return sendError(socket, "NOT_IN_ROOM", "Entre em uma sala antes de pedir revanche.");
      if (membership.role === "SPECTATOR") return sendError(socket, "SPECTATOR_REMATCH", "Espectadores não podem pedir revanche.");
      if (membership.room.status !== "FINISHED") return sendError(socket, "MATCH_NOT_FINISHED", "A revanche só pode ser pedida ao fim da partida.");
      if (membership.room.rematchRequester) return sendError(socket, "REMATCH_ALREADY_REQUESTED", "Aguarde a resposta do adversário.");
      membership.room.rematchRequester = membership.role;
      log("rematch_requested", { roomCode: membership.room.code, role: membership.role });
      io.to(membership.room.code).emit("message", { type: "REMATCH_REQUESTED", roomCode: membership.room.code, requester: membership.role });
      return;
    }
    case "RESPOND_REMATCH": {
      const membership = rooms.getMembership(socket.id);
      if (!membership) return sendError(socket, "NOT_IN_ROOM", "Entre em uma sala antes de responder à revanche.");
      if (membership.role === "SPECTATOR") return sendError(socket, "SPECTATOR_REMATCH", "Espectadores não podem responder à revanche.");
      if (membership.room.status !== "FINISHED" || !membership.room.rematchRequester) return sendError(socket, "NO_REMATCH_REQUEST", "Não há pedido de revanche pendente.");
      if (membership.room.rematchRequester === membership.role) return sendError(socket, "REMATCH_REQUESTER_CANNOT_RESPOND", "Aguarde a resposta do adversário.");
      if (!message.accept) {
        const declinedBy = membership.role;
        membership.room.rematchRequester = null;
        io.to(membership.room.code).emit("message", { type: "REMATCH_DECLINED", roomCode: membership.room.code, declinedBy });
        log("rematch_declined", { roomCode: membership.room.code, declinedBy });
        return;
      }
      if (rooms.startRematch(membership.room)) {
        log("rematch_started", { roomCode: membership.room.code });
        broadcastGameState(membership.room.code);
      }
      return;
    }
    case "LEAVE_ROOM":
      leaveCurrentRoom(socket);
      emitRoomsList();
      return;
  }
}

function gameLoop(): void {
  const now = Date.now();
  for (const room of rooms.activeRooms()) {
    if (room.status === "PAUSED") {
      if (room.pauseEndsAt !== null && now >= room.pauseEndsAt) {
        room.status = "PLAYING";
        room.pauseEndsAt = null;
        room.version += 1;
      } else {
        continue;
      }
    }
    if (room.status !== "PLAYING") continue;

    const result = advanceGame(room.game, room.inputs, TICK_SECONDS);
    room.game = result.game;
    room.version += 1;
    if (result.pointWinner) {
      room.game = addPoint(room.game, result.pointWinner);
      log("point_finished", { roomCode: room.code, winner: result.pointWinner, score: room.game.score });
      if (room.game.score.playerOne >= WINNING_SCORE || room.game.score.playerTwo >= WINNING_SCORE) {
        room.winner = room.game.score.playerOne >= WINNING_SCORE ? "PLAYER_ONE" : "PLAYER_TWO";
        room.status = "FINISHED";
        room.sessionScore = {
          playerOne: room.sessionScore.playerOne + Number(room.winner === "PLAYER_ONE"),
          playerTwo: room.sessionScore.playerTwo + Number(room.winner === "PLAYER_TWO"),
        };
        log("match_finished", { roomCode: room.code, winner: room.winner, sessionScore: room.sessionScore });
        broadcastGameState(room.code);
        io.to(room.code).emit("message", { type: "MATCH_FINISHED", roomCode: room.code, winner: room.winner, sessionScore: room.sessionScore });
        continue;
      }
      room.status = "PAUSED";
      room.pauseEndsAt = now + ROUND_PAUSE_MS;
      room.inputs = { playerOne: "STOP", playerTwo: "STOP" };
      room.game = createNextRound(room.game, result.pointWinner === "PLAYER_ONE" ? "PLAYER_TWO" : "PLAYER_ONE");
      room.version += 1;
    }
    broadcastGameState(room.code);
  }
}

io.on("connection", (socket) => {
  log("connected", { socketId: socket.id, address: socket.handshake.address });

  socket.on("message", (payload) => {
    try {
      handleMessage(socket, payload);
    } catch (error) {
      log("message_handler_failure", { socketId: socket.id, error: error instanceof Error ? error.message : "unknown" });
      sendError(socket, "INTERNAL_ERROR", "Não foi possível processar a mensagem.");
    }
  });

  socket.on("disconnect", (reason) => {
    try {
      const removal = rooms.removeSocket(socket.id);
      log("disconnected", { socketId: socket.id, reason, roomCode: removal?.room.code });
      if (removal?.wasPlayer && !removal.roomDeleted) {
        io.to(removal.room.code).emit("message", {
          type: "OPPONENT_DISCONNECTED",
          roomCode: removal.room.code,
          message: removal.wasInProgress ? "Oponente desistiu da partida." : "Oponente saiu da sala.",
        });
        broadcastGameState(removal.room.code);
      }
      emitRoomsList();
    } catch (error) {
      log("disconnect_handler_failure", { socketId: socket.id, error: error instanceof Error ? error.message : "unknown" });
    }
  });
});

setInterval(gameLoop, 1_000 / TICK_RATE);

httpServer.listen(port, "0.0.0.0", () => {
  log("server_started", { address: `http://0.0.0.0:${port}`, transports: ["websocket"] });
});
