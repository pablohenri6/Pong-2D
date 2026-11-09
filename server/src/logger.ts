export function log(event: string, details?: Record<string, unknown>): void {
  const suffix = details ? ` ${JSON.stringify(details)}` : "";
  console.info(`[${new Date().toISOString()}] ${event}${suffix}`);
}
