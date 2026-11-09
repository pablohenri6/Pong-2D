import { z } from "zod";

const roomCode = z.string().trim().toUpperCase().regex(/^[A-Z2-9]{5}$/);
const username = z.string().trim().min(2).max(20);

/** Valida todo payload externo antes que ele alcance o gerenciador de salas. */
export const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CREATE_ROOM"), username }).strict(),
  z.object({ type: z.literal("JOIN_ROOM"), roomCode, username }).strict(),
  z.object({ type: z.literal("LIST_ROOMS") }).strict(),
  z.object({ type: z.literal("INPUT"), direction: z.enum(["UP", "DOWN", "STOP"]) }).strict(),
  z.object({ type: z.literal("REQUEST_REMATCH") }).strict(),
  z.object({ type: z.literal("RESPOND_REMATCH"), accept: z.boolean() }).strict(),
  z.object({ type: z.literal("LEAVE_ROOM") }).strict(),
]);
