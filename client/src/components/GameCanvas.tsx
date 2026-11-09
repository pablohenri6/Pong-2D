import { useEffect, useRef } from "react";
import { GAME_HEIGHT, GAME_WIDTH, type GameStateMessage } from "@arena/shared";

interface HitEffect {
  x: number;
  y: number;
  text: string;
  createdAt: number;
}

const HIT_LABELS = ["Nice hit!", "Speed up!", "Pow!", "Zoom!", "Faster!"];

export function GameCanvas({ gameState }: { gameState: GameStateMessage | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameStateMessage | null>(gameState);
  const previousBallRef = useRef<{ x: number; y: number; dx: number } | null>(null);
  const previousScoreRef = useRef<string | null>(null);
  const rallyHitsRef = useRef(0);
  const hitEffectsRef = useRef<HitEffect[]>([]);

  useEffect(() => {
    stateRef.current = gameState;
    if (!gameState) return;

    const scoreKey = `${gameState.roomCode}:${gameState.score.playerOne}:${gameState.score.playerTwo}`;
    if (previousScoreRef.current !== scoreKey) {
      previousScoreRef.current = scoreKey;
      rallyHitsRef.current = 0;
      hitEffectsRef.current = [];
      previousBallRef.current = null;
    }

    if (gameState.status !== "PLAYING") {
      previousBallRef.current = { x: gameState.ball.x, y: gameState.ball.y, dx: 0 };
      return;
    }

    const previous = previousBallRef.current;
    const current = gameState.ball;
    if (previous) {
      const dx = current.x - previous.x;
      const jumped = Math.hypot(current.x - previous.x, current.y - previous.y) > 140;
      const bounced = !jumped && Math.abs(previous.dx) > 0.5 && Math.abs(dx) > 0.5 && Math.sign(previous.dx) !== Math.sign(dx);
      if (bounced) {
        rallyHitsRef.current += 1;
        const text = HIT_LABELS[Math.min(rallyHitsRef.current - 1, HIT_LABELS.length - 1)];
        hitEffectsRef.current.push({ x: current.x, y: Math.max(28, current.y - 18), text, createdAt: performance.now() });
      }
      previousBallRef.current = { x: current.x, y: current.y, dx: Math.abs(dx) > 0.01 ? dx : previous.dx };
    } else {
      previousBallRef.current = { x: current.x, y: current.y, dx: 0 };
    }
  }, [gameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let frame = 0;
    const draw = () => {
      const state = stateRef.current;
      context.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      context.fillStyle = "#020617";
      context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      context.setLineDash([10, 12]);
      context.strokeStyle = "#334155";
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(GAME_WIDTH / 2, 0);
      context.lineTo(GAME_WIDTH / 2, GAME_HEIGHT);
      context.stroke();
      context.setLineDash([]);

      if (state) {
        context.fillStyle = "#22d3ee";
        context.fillRect(state.paddles.playerOne.x, state.paddles.playerOne.y, state.paddles.playerOne.width, state.paddles.playerOne.height);
        context.fillStyle = "#f472b6";
        context.fillRect(state.paddles.playerTwo.x, state.paddles.playerTwo.y, state.paddles.playerTwo.width, state.paddles.playerTwo.height);
        context.fillStyle = "#f8fafc";
        context.beginPath();
        context.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
        context.fill();

        const now = performance.now();
        hitEffectsRef.current = hitEffectsRef.current.filter((effect) => now - effect.createdAt < 700);
        for (const effect of hitEffectsRef.current) {
          const age = (now - effect.createdAt) / 700;
          context.save();
          context.globalAlpha = 1 - age;
          context.fillStyle = "#fde047";
          context.font = "bold 18px Inter, system-ui, sans-serif";
          context.textAlign = "center";
          context.textBaseline = "bottom";
          context.fillText(effect.text, effect.x, effect.y - age * 18);
          context.restore();
        }
      }

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} width={GAME_WIDTH} height={GAME_HEIGHT} aria-label="Campo da partida Pong" className="aspect-[4/3] w-full max-w-4xl rounded-xl border border-slate-700 bg-slate-950 shadow-2xl" />;
}
