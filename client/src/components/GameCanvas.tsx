import { useEffect, useRef } from "react";
import { GAME_HEIGHT, GAME_WIDTH, type GameStateMessage } from "@arena/shared";

export function GameCanvas({ gameState }: { gameState: GameStateMessage | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !gameState) return;

    // O cliente somente desenha as coordenadas autoritativas recebidas.
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
    context.fillStyle = "#22d3ee";
    context.fillRect(gameState.paddles.playerOne.x, gameState.paddles.playerOne.y, gameState.paddles.playerOne.width, gameState.paddles.playerOne.height);
    context.fillStyle = "#f472b6";
    context.fillRect(gameState.paddles.playerTwo.x, gameState.paddles.playerTwo.y, gameState.paddles.playerTwo.width, gameState.paddles.playerTwo.height);
    context.fillStyle = "#f8fafc";
    context.beginPath();
    context.arc(gameState.ball.x, gameState.ball.y, gameState.ball.radius, 0, Math.PI * 2);
    context.fill();
  }, [gameState]);

  return <canvas ref={canvasRef} width={GAME_WIDTH} height={GAME_HEIGHT} aria-label="Campo da partida Pong" className="aspect-[4/3] w-full max-w-4xl rounded-xl border border-slate-700 bg-slate-950 shadow-2xl" />;
}
