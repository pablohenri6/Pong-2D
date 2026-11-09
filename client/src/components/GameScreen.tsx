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

const roleName: Record<PlayerRole, string> = {
  PLAYER_ONE: "🏰 Castelo Azul",
  PLAYER_TWO: "🏰 Castelo Vermelho",
  SPECTATOR: "👁 Espectador",
};

function statusText(
  gameState: GameStateMessage | null,
  role: PlayerRole,
  opponentDisconnected: string | null,
): string {
  if (opponentDisconnected) return opponentDisconnected;
  if (!gameState || gameState.status === "WAITING") return "Aguardando cavaleiro oponente...";
  if (gameState.status === "PLAYING") return "⚔️ Batalha em curso";
  if (gameState.status === "PAUSED") return "🔥 Novo saque em instantes";
  if (role === "SPECTATOR") return "Batalha encerrada";
  return gameState.winner === role ? "🏆 Vitória! Glória ao castelo!" : "💀 Derrota — o castelo caiu";
}

export function GameScreen({
  roomCode,
  role,
  gameState,
  opponentDisconnected,
  rematch,
  onInput,
  onRematch,
  onRespondRematch,
  onLeave,
}: GameScreenProps) {
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
    <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-6 sm:px-6">

      {/* Cabeçalho — código da sala e papel */}
      <header
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
        style={{ background: "linear-gradient(to right, #1a1232, #2d2050, #1a1232)", border: "1px solid #4a4563" }}
      >
        <div>
          <p className="font-mono text-sm text-amber-400 tracking-widest">SALA {roomCode}</p>
          <p className="font-bold text-white text-lg">{roleName[role]}</p>
        </div>
        <p
          className="rounded-full px-4 py-1 text-sm font-semibold text-amber-100 tracking-wide"
          style={{ background: "rgba(180,83,9,0.25)", border: "1px solid #b45309" }}
        >
          {statusText(gameState, role, opponentDisconnected)}
        </p>
      </header>

      {/* ScoreBoard — Batalha de Torres */}
      <div
        className="rounded-xl px-4 py-3"
        style={{
          background: "linear-gradient(to bottom, #2d2640, #151122)",
          borderBottom: "4px solid #b45309",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}
      >
        <div className="grid grid-cols-3 items-center text-center">
          {/* Castelo Azul (Player One) */}
          <div>
            <p className="text-xs uppercase tracking-widest text-blue-300 font-semibold">
              🏰 {players.playerOne ?? "Castelo Azul"}
            </p>
            <p className="text-5xl font-black text-blue-300 mt-1" style={{ textShadow: "0 0 20px rgba(96,165,250,0.6)" }}>
              {score.playerOne}
            </p>
            {/* Vida do castelo azul */}
            {gameState && (
              <HealthDisplay health={gameState.paddles.playerOne.health ?? 100} color="#60a5fa" />
            )}
          </div>

          {/* Centro */}
          <div className="flex flex-col items-center gap-1">
            <p className="text-amber-400 font-bold tracking-widest text-xs uppercase">⚔️ Batalha de Torres</p>
            <p className="text-2xl font-black text-amber-500">×</p>
          </div>

          {/* Castelo Vermelho (Player Two) */}
          <div>
            <p className="text-xs uppercase tracking-widest text-red-300 font-semibold">
              🏰 {players.playerTwo ?? "Castelo Vermelho"}
            </p>
            <p className="text-5xl font-black text-red-300 mt-1" style={{ textShadow: "0 0 20px rgba(248,113,113,0.6)" }}>
              {score.playerTwo}
            </p>
            {/* Vida do castelo vermelho */}
            {gameState && (
              <HealthDisplay health={gameState.paddles.playerTwo.health ?? 100} color="#f87171" />
            )}
          </div>
        </div>
      </div>

      {/* Canvas do jogo */}
      <GameCanvas gameState={gameState} />

      {/* Oponente desconectou */}
      {opponentDisconnected && role !== "SPECTATOR" && (
        <section
          className="mx-auto grid w-full max-w-2xl gap-4 rounded-2xl p-5 text-center"
          style={{ background: "rgba(120,53,15,0.3)", border: "1px solid rgba(217,119,6,0.5)" }}
        >
          <p className="text-lg font-bold text-amber-100">{opponentDisconnected}</p>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-xl px-6 py-4 text-lg font-black text-white transition"
            style={{ background: "#2d2640", border: "1px solid #6d5e9c" }}
          >
            Voltar ao Lobby
          </button>
        </section>
      )}

      {/* Fim de partida — revanche */}
      {!opponentDisconnected && gameState?.status === "FINISHED" && role !== "SPECTATOR" && (
        <section
          className="mx-auto grid w-full max-w-2xl gap-3 rounded-2xl p-5 text-center"
          style={{ background: "linear-gradient(to bottom, #2d2640, #151122)", border: "1px solid #6d5e9c" }}
        >
          {awaitingOpponent && (
            <p className="font-semibold text-amber-200">Aguardando o oponente aceitar a revanche…</p>
          )}
          {canRespondToRematch && (
            <p className="font-semibold text-amber-200">Seu oponente desafia você para uma revanche. Aceita?</p>
          )}
          {declinedBy && (
            <p className="font-semibold text-red-300">
              {declinedBy === role ? "Você recusou a revanche." : "Revanche recusada pelo oponente."}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 mt-2">
            {canRespondToRematch ? (
              <>
                <button
                  type="button"
                  onClick={() => onRespondRematch(true)}
                  className="rounded-xl px-6 py-5 text-lg font-black text-white transition"
                  style={{ background: "linear-gradient(135deg, #b45309, #d97706)", boxShadow: "0 0 15px rgba(180,83,9,0.4)" }}
                >
                  ⚔️ Aceitar Revanche
                </button>
                <button
                  type="button"
                  onClick={() => { onRespondRematch(false); onLeave(); }}
                  className="rounded-xl px-6 py-5 text-lg font-black text-red-200 transition"
                  style={{ background: "rgba(127,29,29,0.4)", border: "1px solid rgba(248,113,113,0.5)" }}
                >
                  Recusar e Sair
                </button>
              </>
            ) : declinedBy ? (
              <>
                <button
                  type="button"
                  disabled
                  className="rounded-xl px-6 py-5 text-lg font-black opacity-50"
                  style={{ background: "#2d2640", color: "#9ca3af" }}
                >
                  Revanche Recusada
                </button>
                <button
                  type="button"
                  onClick={onLeave}
                  className="rounded-xl px-6 py-5 text-lg font-black text-white transition"
                  style={{ background: "#2d2640", border: "1px solid #6d5e9c" }}
                >
                  Voltar ao Lobby
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onRematch}
                  disabled={awaitingOpponent}
                  className="rounded-xl px-6 py-5 text-lg font-black text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #b45309, #d97706)", boxShadow: "0 0 15px rgba(180,83,9,0.4)" }}
                >
                  ⚔️ Pedir Revanche
                </button>
                <button
                  type="button"
                  onClick={onLeave}
                  className="rounded-xl px-6 py-5 text-lg font-black text-white transition"
                  style={{ background: "#2d2640", border: "1px solid #6d5e9c" }}
                >
                  Voltar ao Lobby
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {/* Controles mobile */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        <button
          type="button"
          disabled={!canControl}
          onPointerDown={() => onInput("UP")}
          onPointerUp={() => onInput("STOP")}
          onPointerLeave={() => onInput("STOP")}
          className="rounded-xl py-5 text-2xl font-bold disabled:opacity-40 transition"
          style={{ background: "#2d2640", border: "1px solid #6d5e9c" }}
        >
          ↑
        </button>
        <button
          type="button"
          disabled={!canControl}
          onPointerDown={() => onInput("DOWN")}
          onPointerUp={() => onInput("STOP")}
          onPointerLeave={() => onInput("STOP")}
          className="rounded-xl py-5 text-2xl font-bold disabled:opacity-40 transition"
          style={{ background: "#2d2640", border: "1px solid #6d5e9c" }}
        >
          ↓
        </button>
      </div>

      {role !== "SPECTATOR" && (
        <p className="text-center text-sm text-slate-500">Teclado: W/S ou ↑/↓ · No celular, use os botões.</p>
      )}
    </section>
  );
}

/** Barra de vida do castelo exibida abaixo do placar. */
function HealthDisplay({ health, color }: { health: number; color: string }) {
  const hue = health > 50 ? 120 : health > 25 ? 45 : 0;
  const barColor = `hsl(${hue}, 70%, 50%)`;
  return (
    <div className="mt-2 flex flex-col items-center gap-1">
      <div
        className="h-2 w-24 rounded-full overflow-hidden"
        style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${color}40` }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${health}%`, background: barColor }}
        />
      </div>
      <p className="text-xs" style={{ color: `${color}99` }}>
        {Math.round(health)}% vida
      </p>
    </div>
  );
}
