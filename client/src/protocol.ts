import type { ServerMessage } from "@arena/shared";

/** Estado mínimo da comunicação que será preenchido pelo hook de socket na Etapa 4. */
export interface ClientConnectionState {
  lastMessage: ServerMessage | null;
}
