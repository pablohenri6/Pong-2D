import { useEffect } from "react";
import type { GameStateMessage, PaddleDirection, PlayerRole } from "@arena/shared";
import { GameCanvas } from "./GameCanvas";

interface GameScreenProps {
  roomCode: string;
  role: PlayerRole;
  gameState: GameStateMessage | null;
  opponentDisconnected: string | null;
  rematch: { requester: "PLAYER_ONE" | "PLAYER_TWO" } | { declinedBy: "PLAYER_ONE" | "PLAYER_TWO" } | null;
  onInput: (direction: PaddleDirection) => void;
  onRematch: () => void;
  onRespondRematch: (accept: boolean) => void;
  onLeave: () => void;
}

const roleName: Record<PlayerRole, string> = { PLAYER_ONE: "Jogador 1", PLAYER_TWO: "Jogador 2", SPECTATOR: "Espectador" };

function statusText(gameState: GameStateMessage | null, role: PlayerRole, opponentDisconnected: string | null): string {
  if (opponentDisconnected) return opponentDisconnected;
  if (!gameState || gameState.status === "WAITING") return "Aguardando oponente";
  if (gameState.status === "PLAYING") return "Partida em andamento";
  if (gameState.status === "PAUSED") return "Novo saque em instantes";
  if (role === "SPECTATOR") return "Partida encerrada";
  return gameState.winner === role ? "Vitória" : "Derrota";
}

export function GameScreen({ roomCode, role, gameState, opponentDisconnected, rematch, onInput, onRematch, onRespondRematch, onLeave }: GameScreenProps) {
  const canControl = role !== "SPECTATOR" && gameState?.status === "PLAYING";
  const requester = rematch && "requester" in rematch ? rematch.requester : null;
  const declinedBy = rematch && "declinedBy" in rematch ? rematch.declinedBy : null;
  const awaitingOpponent = requester === role;
  const canRespondToRematch = requester !== null && requester !== role;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!canControl || event.repeat) return;
      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") { event.preventDefault(); onInput("UP"); }
      if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") { event.preventDefault(); onInput("DOWN"); }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (!canControl) return;
      if (["ArrowUp", "ArrowDown", "w", "W", "s", "S"].includes(event.key)) { event.preventDefault(); onInput("STOP"); }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, [canControl, onInput]);

  const score = gameState?.score ?? { playerOne: 0, playerTwo: 0 };
  const players = gameState?.players ?? { playerOne: null, playerTwo: null };
  return (
    <section className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
        <div><p className="font-mono text-sm text-cyan-300">SALA {roomCode}</p><p className="font-bold text-white">{roleName[role]}</p></div>
        <p className="rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-100">{statusText(gameState, role, opponentDisconnected)}</p>
      </header>
      <div className="grid grid-cols-3 items-center text-center"><div><p className="text-xs uppercase tracking-widest text-cyan-300">{players.playerOne ?? "Jogador 1"}</p><p className="text-4xl font-black">{score.playerOne}</p></div><p className="text-lg font-bold text-slate-500">×</p><div><p className="text-xs uppercase tracking-widest text-pink-300">{players.playerTwo ?? "Jogador 2"}</p><p className="text-4xl font-black">{score.playerTwo}</p></div></div>
      <GameCanvas gameState={gameState} />
      {opponentDisconnected && (
        <section className="mx-auto grid w-full max-w-2xl gap-4 rounded-2xl border border-amber-400/50 bg-amber-950/40 p-5 text-center">
          <p className="text-lg font-bold text-amber-100">{opponentDisconnected}</p>
          <button type="button" onClick={onLeave} className="rounded-xl border border-slate-500 bg-slate-800 px-6 py-4 text-lg font-black text-white transition hover:border-slate-300 hover:bg-slate-700">Sair</button>
        </section>
      )}
      {gameState?.status === "FINISHED" && role !== "SPECTATOR" && (
        <section className="mx-auto grid w-full max-w-2xl gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-5 text-center">
          {awaitingOpponent && <p className="font-semibold text-cyan-200">Aguardando o oponente aceitar a revanche…</p>}
          {canRespondToRematch && <p className="font-semibold text-cyan-200">Seu oponente pediu uma revanche. Você aceita?</p>}
          {declinedBy && <p className="font-semibold text-rose-200">{declinedBy === role ? "Você recusou a revanche." : "Revanche recusada pelo oponente."}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {canRespondToRematch ? (
              <>
                <button type="button" onClick={() => onRespondRematch(true)} className="rounded-xl bg-cyan-400 px-6 py-5 text-lg font-black text-slate-950 transition hover:bg-cyan-300">Aceitar revanche</button>
                <button type="button" onClick={() => { onRespondRematch(false); onLeave(); }} className="rounded-xl border border-rose-400/70 bg-rose-950/60 px-6 py-5 text-lg font-black text-rose-100 transition hover:border-rose-300 hover:bg-rose-900">Recusar e sair</button>
              </>
            ) : declinedBy ? (
              <>
                <button type="button" disabled className="rounded-xl bg-slate-700 px-6 py-5 text-lg font-black text-slate-300 opacity-50">Revanche recusada</button>
                <button type="button" onClick={onLeave} className="rounded-xl border border-slate-500 bg-slate-800 px-6 py-5 text-lg font-black text-white transition hover:border-slate-300 hover:bg-slate-700">Sair</button>
              </>
            ) : (
              <>
                <button type="button" onClick={onRematch} disabled={awaitingOpponent} className="rounded-xl bg-cyan-400 px-6 py-5 text-lg font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40">Pedir revanche</button>
                <button type="button" onClick={onLeave} className="rounded-xl border border-slate-500 bg-slate-800 px-6 py-5 text-lg font-black text-white transition hover:border-slate-300 hover:bg-slate-700">Sair</button>
              </>
            )}
          </div>
        </section>
      )}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        <button type="button" disabled={!canControl} onPointerDown={() => onInput("UP")} onPointerUp={() => onInput("STOP")} onPointerLeave={() => onInput("STOP")} className="rounded-xl bg-slate-700 py-5 text-2xl font-bold disabled:opacity-40">↑</button>
        <button type="button" disabled={!canControl} onPointerDown={() => onInput("DOWN")} onPointerUp={() => onInput("STOP")} onPointerLeave={() => onInput("STOP")} className="rounded-xl bg-slate-700 py-5 text-2xl font-bold disabled:opacity-40">↓</button>
      </div>
      {role !== "SPECTATOR" && <p className="text-center text-sm text-slate-400">Teclado: W/S ou ↑/↓ · No celular, use os botões.</p>}
    </section>
  );
}
