import type { PaddleDirection, PlayerRole, PublicRoom, RoomStatus, ScoreState } from "@arena/shared";
import { createInitialGameState, type AuthoritativeGameState } from "./game-engine.js";

export interface Room {
  code: string;
  status: RoomStatus;
  playerOneSocketId: string | null;
  playerTwoSocketId: string | null;
  playerOneName: string | null;
  playerTwoName: string | null;
  spectatorSocketIds: Set<string>;
  game: AuthoritativeGameState;
  sessionScore: ScoreState;
  winner: "PLAYER_ONE" | "PLAYER_TWO" | null;
  inputs: { playerOne: PaddleDirection; playerTwo: PaddleDirection };
  rematchRequester: "PLAYER_ONE" | "PLAYER_TWO" | null;
  pauseEndsAt: number | null;
  version: number;
}

export interface Membership {
  room: Room;
  role: PlayerRole;
}

export interface Removal {
  room: Room;
  role: PlayerRole;
  wasPlayer: boolean;
  wasInProgress: boolean;
  roomDeleted: boolean;
}

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Mantém salas inteiramente em memória e não depende de Socket.IO. */
export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  private readonly memberships = new Map<string, Membership>();

  createRoom(socketId: string, username: string): Membership {
    const room: Room = {
      code: this.generateCode(),
      status: "WAITING",
      playerOneSocketId: null,
      playerTwoSocketId: null,
      playerOneName: null,
      playerTwoName: null,
      spectatorSocketIds: new Set(),
      game: createInitialGameState(),
      sessionScore: { playerOne: 0, playerTwo: 0 },
      winner: null,
      inputs: { playerOne: "STOP", playerTwo: "STOP" },
      rematchRequester: null,
      pauseEndsAt: null,
      version: 0,
    };
    this.rooms.set(room.code, room);
    return this.addToRoom(socketId, room, username);
  }

  joinRoom(socketId: string, roomCode: string, username: string): Membership | null {
    const room = this.rooms.get(roomCode);
    return room ? this.addToRoom(socketId, room, username) : null;
  }

  getMembership(socketId: string): Membership | null {
    return this.memberships.get(socketId) ?? null;
  }

  removeSocket(socketId: string): Removal | null {
    const membership = this.memberships.get(socketId);
    if (!membership) return null;

    const { room, role } = membership;
    const wasInProgress = room.status === "PLAYING" || room.status === "PAUSED";
    this.memberships.delete(socketId);
    const wasPlayer = role !== "SPECTATOR";

    if (role === "PLAYER_ONE") { room.playerOneSocketId = null; room.playerOneName = null; }
    if (role === "PLAYER_TWO") { room.playerTwoSocketId = null; room.playerTwoName = null; }
    if (role === "SPECTATOR") room.spectatorSocketIds.delete(socketId);

    if (wasPlayer) this.resetWaitingMatch(room);

    const roomDeleted = this.isEmpty(room);
    if (roomDeleted) this.rooms.delete(room.code);
    return { room, role, wasPlayer, wasInProgress, roomDeleted };
  }

  listPublicRooms(): PublicRoom[] {
    return [...this.rooms.values()]
      .map((room) => ({
        code: room.code,
        status: room.status,
        playerCount: Number(room.playerOneSocketId !== null) + Number(room.playerTwoSocketId !== null),
        spectatorCount: room.spectatorSocketIds.size,
      }))
      .sort((left, right) => left.code.localeCompare(right.code));
  }

  activeRooms(): Iterable<Room> {
    return this.rooms.values();
  }

  startMatchIfReady(room: Room): boolean {
    if (room.status !== "WAITING" || room.playerOneSocketId === null || room.playerTwoSocketId === null) return false;
    this.startFreshMatch(room);
    return true;
  }

  startRematch(room: Room): boolean {
    if (room.status !== "FINISHED" || room.playerOneSocketId === null || room.playerTwoSocketId === null) return false;
    this.startFreshMatch(room);
    return true;
  }

  private startFreshMatch(room: Room): void {
    room.status = "PLAYING";
    room.game = createInitialGameState();
    room.winner = null;
    room.inputs = { playerOne: "STOP", playerTwo: "STOP" };
    room.rematchRequester = null;
    room.pauseEndsAt = null;
    room.version += 1;
  }

  resetWaitingMatch(room: Room): void {
    room.status = "WAITING";
    room.game = createInitialGameState();
    room.winner = null;
    room.inputs = { playerOne: "STOP", playerTwo: "STOP" };
    room.rematchRequester = null;
    room.pauseEndsAt = null;
    room.version += 1;
  }

  private addToRoom(socketId: string, room: Room, username: string): Membership {
    const current = this.memberships.get(socketId);
    if (current?.room.code === room.code) return current;
    if (current) this.removeSocket(socketId);

    let role: PlayerRole;
    if (room.playerOneSocketId === null) {
      room.playerOneSocketId = socketId;
      room.playerOneName = username;
      role = "PLAYER_ONE";
    } else if (room.playerTwoSocketId === null) {
      room.playerTwoSocketId = socketId;
      room.playerTwoName = username;
      role = "PLAYER_TWO";
    } else {
      room.spectatorSocketIds.add(socketId);
      role = "SPECTATOR";
    }

    const membership = { room, role };
    this.memberships.set(socketId, membership);
    return membership;
  }

  private generateCode(): string {
    let code: string;
    do {
      code = Array.from({ length: 5 }, () => ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)]).join("");
    } while (this.rooms.has(code));
    return code;
  }

  private isEmpty(room: Room): boolean {
    return room.playerOneSocketId === null && room.playerTwoSocketId === null && room.spectatorSocketIds.size === 0;
  }
}
