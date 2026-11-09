import { GameScreen } from "./components/GameScreen";
import { Lobby } from "./components/Lobby";
import { useGameSocket } from "./hooks/useGameSocket";

export function App() {
  const game = useGameSocket();
  return (
    <main className="min-h-screen bg-[#0d0b1a] text-slate-100">
      {game.roomCode === null || game.role === null ? <Lobby connected={game.connected} rooms={game.rooms} onCreate={game.createRoom} onJoin={game.joinRoom} onRefresh={game.refreshRooms} /> : <GameScreen roomCode={game.roomCode} role={game.role} gameState={game.gameState} opponentDisconnected={game.opponentDisconnected} rematch={game.rematch} onInput={game.sendInput} onRematch={game.requestRematch} onRespondRematch={game.respondRematch} onLeave={game.leaveRoom} />}
      <footer className="px-4 pb-5 text-center text-xs text-slate-500">{game.connected ? "Conectado por WebSocket" : "Desconectado"}{game.serverUrl ? ` · ${game.serverUrl}` : ""}</footer>
      {game.error && <div className="fixed inset-x-4 bottom-4 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-xl border border-rose-500/50 bg-rose-950 px-4 py-3 text-sm text-rose-100"><span>{game.error}</span><button type="button" aria-label="Fechar mensagem" onClick={game.clearError} className="font-bold">×</button></div>}
    </main>
  );
}
