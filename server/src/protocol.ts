import type { ClientMessage, ServerMessage } from "@arena/shared";

/** Tipos usados pela camada Socket.IO na Etapa 2. */
export interface SocketProtocol {
  incoming: ClientMessage;
  outgoing: ServerMessage;
}
