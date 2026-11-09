import { useCallback, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ClientMessage, GameStateMessage, PaddleDirection, PlayerRole, PublicRoom, ServerMessage } from "@arena/shared";

interface SocketState {
  connected: boolean;
  roomCode: string | null;
  role: PlayerRole | null;
  rooms: PublicRoom[];
  gameState: GameStateMessage | null;
  error: string | null;
  opponentDisconnected: string | null;
  rematch: { requester: "PLAYER_ONE" | "PLAYER_TWO" } | { declinedBy: "PLAYER_ONE" | "PLAYER_TWO" } | null;
}

const initialState: SocketState = {
  connected: false,
  roomCode: null,
  role: null,
  rooms: [],
  gameState: null,
  error: null,
  opponentDisconnected: null,
  rematch: null,
};

/** Centraliza a comunicação Socket.IO; componentes recebem somente estado e comandos. */
export function useGameSocket() {
  const [state, setState] = useState<SocketState>(initialState);
  const serverUrl = import.meta.env.VITE_SERVER_URL?.trim();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!serverUrl) {
      setState((current) => ({ ...current, error: "Defina VITE_SERVER_URL no arquivo .env do client." }));
      return;
    }

    const connection = io(serverUrl, { transports: ["websocket"] });
    setSocket(connection);
    if (import.meta.env.DEV) (window as Window & { __arenaSocket?: Socket }).__arenaSocket = connection;

    const handleMessage = (message: ServerMessage) => {
      switch (message.type) {
        case "ROLE_ASSIGNED":
          setState((current) => ({ ...current, roomCode: message.roomCode, role: message.role, gameState: null, error: null, opponentDisconnected: null, rematch: null }));
          return;
        case "ROOMS_LIST":
          setState((current) => ({ ...current, rooms: message.rooms }));
          return;
        case "GAME_STATE":
          setState((current) => {
            if (current.gameState?.roomCode === message.roomCode && current.gameState.version >= message.version) return current;
            return {
              ...current,
              gameState: message,
              // Ao sair, o servidor também atualiza a sala para WAITING. Preserve o aviso
              // até o usuário voltar ao lobby; ele só deve sumir ao iniciar uma nova partida.
              opponentDisconnected: message.status === "PLAYING" ? null : current.opponentDisconnected,
              rematch: message.status === "PLAYING" ? null : current.rematch,
            };
          });
          return;
        case "OPPONENT_DISCONNECTED":
          setState((current) => ({ ...current, opponentDisconnected: message.message }));
          return;
        case "REMATCH_REQUESTED":
          setState((current) => ({ ...current, rematch: { requester: message.requester } }));
          return;
        case "REMATCH_DECLINED":
          setState((current) => ({ ...current, rematch: { declinedBy: message.declinedBy } }));
          return;
        case "ERROR":
          setState((current) => ({ ...current, error: message.message }));
          return;
        case "MATCH_FINISHED":
        case "INPUT_ACCEPTED":
          return;
      }
    };

    connection.on("connect", () => {
      setState((current) => ({ ...current, connected: true, error: null }));
      connection.emit("message", { type: "LIST_ROOMS" } satisfies ClientMessage);
    });
    connection.on("disconnect", () => setState((current) => ({ ...current, connected: false })));
    connection.on("connect_error", () => setState((current) => ({ ...current, connected: false, error: "Não foi possível conectar ao servidor." })));
    connection.on("message", handleMessage);

    return () => {
      connection.disconnect();
      if ((window as Window & { __arenaSocket?: Socket }).__arenaSocket === connection) delete (window as Window & { __arenaSocket?: Socket }).__arenaSocket;
      setSocket(null);
    };
  }, [serverUrl]);

  const send = useCallback((message: ClientMessage) => socket?.emit("message", message), [socket]);

  return {
    ...state,
    serverUrl,
    createRoom: (username: string) => send({ type: "CREATE_ROOM", username: username.trim() }),
    joinRoom: (roomCode: string, username: string) => send({ type: "JOIN_ROOM", roomCode: roomCode.trim().toUpperCase(), username: username.trim() }),
    refreshRooms: () => send({ type: "LIST_ROOMS" }),
    sendInput: (direction: PaddleDirection) => send({ type: "INPUT", direction }),
    requestRematch: () => send({ type: "REQUEST_REMATCH" }),
    respondRematch: (accept: boolean) => send({ type: "RESPOND_REMATCH", accept }),
    leaveRoom: () => {
      send({ type: "LEAVE_ROOM" });
      setState((current) => ({ ...current, roomCode: null, role: null, gameState: null, opponentDisconnected: null, rematch: null, error: null }));
    },
    clearError: () => setState((current) => ({ ...current, error: null })),
  };
}
