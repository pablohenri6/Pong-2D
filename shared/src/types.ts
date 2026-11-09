/** Contrato de mensagens Socket.IO do Pong. Cada payload tem um discriminador `type`. */

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export type PlayerRole = "PLAYER_ONE" | "PLAYER_TWO" | "SPECTATOR";
export type PaddleDirection = "UP" | "DOWN" | "STOP";
export type RoomStatus = "WAITING" | "PLAYING" | "PAUSED" | "FINISHED";

export interface PaddleState {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Vida do castelo de 0 a 100 (apenas visual; não afeta regra de vitória). */
  health: number;
}

export interface BallState {
  x: number;
  y: number;
  radius: number;
}

export interface ScoreState {
  playerOne: number;
  playerTwo: number;
}

export interface PublicRoom {
  code: string;
  status: RoomStatus;
  playerCount: number;
  spectatorCount: number;
}

/** Cliente pede ao servidor a criação de uma sala e passa a integrá-la. */
export interface CreateRoomMessage {
  type: "CREATE_ROOM";
  username: string;
}

/** Cliente entra em uma sala existente pelo código curto informado. */
export interface JoinRoomMessage {
  type: "JOIN_ROOM";
  roomCode: string;
  username: string;
}

/** Cliente solicita a relação pública das salas disponíveis. */
export interface ListRoomsMessage {
  type: "LIST_ROOMS";
}

/** Cliente envia somente a intenção de mover; a física fica no servidor. */
export interface InputMessage {
  type: "INPUT";
  direction: PaddleDirection;
}

/** Jogador confirma que deseja uma nova partida na mesma sala. */
export interface RequestRematchMessage {
  type: "REQUEST_REMATCH";
}

/** O adversário aceita ou recusa uma solicitação de revanche pendente. */
export interface RespondRematchMessage {
  type: "RESPOND_REMATCH";
  accept: boolean;
}

/** Cliente sai da sala atual e retorna ao lobby sem desconectar do servidor. */
export interface LeaveRoomMessage {
  type: "LEAVE_ROOM";
}

export type ClientMessage =
  | CreateRoomMessage
  | JoinRoomMessage
  | ListRoomsMessage
  | InputMessage
  | RequestRematchMessage
  | RespondRematchMessage
  | LeaveRoomMessage;

/** Servidor confirma a sala atribuída e o papel automático da conexão. */
export interface RoleAssignedMessage {
  type: "ROLE_ASSIGNED";
  roomCode: string;
  role: PlayerRole;
}

/** Servidor entrega a lista pública usada pelo lobby. */
export interface RoomsListMessage {
  type: "ROOMS_LIST";
  rooms: PublicRoom[];
}

/** Snapshot autoritativo do jogo; `version` cresce monotonicamente por sala. */
export interface GameStateMessage {
  type: "GAME_STATE";
  roomCode: string;
  version: number;
  status: RoomStatus;
  paddles: { playerOne: PaddleState; playerTwo: PaddleState };
  ball: BallState;
  score: ScoreState;
  sessionScore: ScoreState;
  winner: PlayerRole | null;
  players: { playerOne: string | null; playerTwo: string | null };
}

/** Servidor informa que o adversário saiu e a partida foi encerrada ou pausada. */
export interface OpponentDisconnectedMessage {
  type: "OPPONENT_DISCONNECTED";
  roomCode: string;
  message: string;
}

/** Servidor informa a conclusão de uma partida e o vencedor autoritativo. */
export interface MatchFinishedMessage {
  type: "MATCH_FINISHED";
  roomCode: string;
  winner: "PLAYER_ONE" | "PLAYER_TWO";
  sessionScore: ScoreState;
}

/** Servidor avisa que um jogador está aguardando a decisão do adversário. */
export interface RematchRequestedMessage {
  type: "REMATCH_REQUESTED";
  roomCode: string;
  requester: "PLAYER_ONE" | "PLAYER_TWO";
}

/** Servidor informa que a revanche foi recusada. */
export interface RematchDeclinedMessage {
  type: "REMATCH_DECLINED";
  roomCode: string;
  declinedBy: "PLAYER_ONE" | "PLAYER_TWO";
}

/** Servidor confirma, apenas durante a Etapa 2, que um comando válido chegou à sala. */
export interface InputAcceptedMessage {
  type: "INPUT_ACCEPTED";
  direction: PaddleDirection;
}

/** Servidor responde somente ao remetente quando rejeita uma mensagem inválida. */
export interface ErrorMessage {
  type: "ERROR";
  code: string;
  message: string;
}

export type ServerMessage =
  | RoleAssignedMessage
  | RoomsListMessage
  | GameStateMessage
  | OpponentDisconnectedMessage
  | MatchFinishedMessage
  | RematchRequestedMessage
  | RematchDeclinedMessage
  | InputAcceptedMessage
  | ErrorMessage;
