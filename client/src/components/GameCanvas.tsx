import { useEffect, useRef } from "react";
import { GAME_HEIGHT, GAME_WIDTH, type GameStateMessage } from "@arena/shared";

// Posição X das torres decorativas laterais (igual ao TOWER_OFFSET do servidor)
const TOWER_OFFSET = 55;

/** Desenha as ameias (crenelamentos) ao longo de uma borda horizontal. */
function drawBattlements(
  ctx: CanvasRenderingContext2D,
  y: number,
  width: number,
  merlonH: number,
  onTop: boolean,
) {
  const merlonW = 18;
  const gap = 14;
  const count = Math.floor(width / (merlonW + gap));
  const totalW = count * (merlonW + gap) - gap;
  const startX = (width - totalW) / 2;

  ctx.fillStyle = "#2a2545";
  for (let i = 0; i < count; i++) {
    const mx = startX + i * (merlonW + gap);
    ctx.fillRect(mx, onTop ? y - merlonH : y, merlonW, merlonH);
  }
}

/** Desenha uma barra de vida colorida (verde → amarelo → vermelho) acima ou abaixo do escudo. */
function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  health: number,
) {
  const barW = width + 8;
  const barH = 5;
  const bx = x - 4;
  const by = y - 10;

  // Fundo escuro
  ctx.fillStyle = "#1a1829";
  ctx.fillRect(bx, by, barW, barH);

  // Preenchimento colorido
  const hue = health > 50 ? 120 : health > 25 ? 45 : 0; // verde / amarelo / vermelho
  ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
  ctx.fillRect(bx, by, (barW * health) / 100, barH);

  // Borda
  ctx.strokeStyle = "#4a4563";
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, barW, barH);
}

/** Desenha o escudo heráldico de um jogador com detalhes de pedra e metal. */
function drawShield(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  isPlayerOne: boolean,
  health: number,
) {
  const primary = isPlayerOne ? "#1e3a8a" : "#7f1d1d";
  const accent = isPlayerOne ? "#60a5fa" : "#f87171";
  const emblemColor = isPlayerOne ? "#93c5fd" : "#fca5a5";

  // Sombra
  ctx.shadowColor = accent;
  ctx.shadowBlur = 12;

  // Corpo da torre (retângulo principal)
  const grad = ctx.createLinearGradient(x, y, x + width, y);
  grad.addColorStop(0, primary);
  grad.addColorStop(0.5, shadeColor(primary, 20));
  grad.addColorStop(1, primary);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, width, height);

  // Borda metálica
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  ctx.shadowBlur = 0;

  // Emblema (linha central)
  ctx.strokeStyle = emblemColor;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(x + width / 2, y + 6);
  ctx.lineTo(x + width / 2, y + height - 6);
  ctx.stroke();
  ctx.setLineDash([]);

  // Barra de vida
  drawHealthBar(ctx, x, y, width, health);
}

/** Desenha uma bola de fogo com brilho e rastro. */
function drawFireball(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  // Rastro de chamas (círculos semi-transparentes atrás)
  for (let i = 3; i >= 1; i--) {
    ctx.globalAlpha = 0.15 * i;
    ctx.fillStyle = i % 2 === 0 ? "#f97316" : "#fbbf24";
    ctx.beginPath();
    ctx.arc(x - i * 5, y, radius * (1 - i * 0.15), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Halo externo
  ctx.shadowColor = "#f97316";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
  ctx.fill();

  // Núcleo amarelo brilhante
  ctx.shadowColor = "#fde68a";
  ctx.shadowBlur = 10;
  const fireGrad = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, radius);
  fireGrad.addColorStop(0, "#fef3c7");
  fireGrad.addColorStop(0.5, "#fbbf24");
  fireGrad.addColorStop(1, "#f97316");
  ctx.fillStyle = fireGrad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

/** Utilitário: clareia ou escurece uma cor hex. */
function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (num >> 16) + percent);
  const g = Math.min(255, ((num >> 8) & 0xff) + percent);
  const b = Math.min(255, (num & 0xff) + percent);
  return `rgb(${r},${g},${b})`;
}

export function GameCanvas({ gameState }: { gameState: GameStateMessage | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !gameState) return;

    // --- FUNDO ---
    const bg = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    bg.addColorStop(0, "#0d0b1a");
    bg.addColorStop(1, "#1a1829");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Estrelas estáticas (posições determinísticas)
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    const starSeeds = [37, 83, 127, 211, 251, 311, 379, 431, 487, 541, 601, 659, 719];
    for (const seed of starSeeds) {
      const sx = ((seed * 173) % (GAME_WIDTH - 2 * TOWER_OFFSET)) + TOWER_OFFSET;
      const sy = ((seed * 97) % (GAME_HEIGHT - 30)) + 15;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // --- MURALHA SUPERIOR E INFERIOR ---
    ctx.fillStyle = "#1e1b35";
    ctx.fillRect(0, 0, GAME_WIDTH, 15);
    ctx.fillRect(0, GAME_HEIGHT - 15, GAME_WIDTH, 15);
    ctx.strokeStyle = "#4a4563";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 15, GAME_WIDTH, 1);
    ctx.strokeRect(0, GAME_HEIGHT - 16, GAME_WIDTH, 1);
    drawBattlements(ctx, 15, GAME_WIDTH, 10, true);
    drawBattlements(ctx, GAME_HEIGHT - 15, GAME_WIDTH, 10, false);

    // --- TORRES LATERAIS DECORATIVAS ---
    const towerColor = "#1e1b35";
    const towerBorder = "#4a4563";
    // Torre esquerda
    ctx.fillStyle = towerColor;
    ctx.fillRect(0, 0, TOWER_OFFSET, GAME_HEIGHT);
    ctx.strokeStyle = towerBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(TOWER_OFFSET - 1, 0, 1, GAME_HEIGHT);
    // Torre direita
    ctx.fillStyle = towerColor;
    ctx.fillRect(GAME_WIDTH - TOWER_OFFSET, 0, TOWER_OFFSET, GAME_HEIGHT);
    ctx.strokeStyle = towerBorder;
    ctx.strokeRect(GAME_WIDTH - TOWER_OFFSET, 0, 1, GAME_HEIGHT);

    // --- LINHA CENTRAL (muralha divisória) ---
    ctx.strokeStyle = "#4a4563";
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2, 15);
    ctx.lineTo(GAME_WIDTH / 2, GAME_HEIGHT - 15);
    ctx.stroke();
    ctx.setLineDash([]);

    // --- ESCUDOS DOS JOGADORES ---
    const { playerOne: p1, playerTwo: p2 } = gameState.paddles;
    drawShield(ctx, p1.x, p1.y, p1.width, p1.height, true, p1.health ?? 100);
    drawShield(ctx, p2.x, p2.y, p2.width, p2.height, false, p2.health ?? 100);

    // --- BOLA DE FOGO ---
    const { ball } = gameState;
    drawFireball(ctx, ball.x, ball.y, ball.radius);
  }, [gameState]);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_WIDTH}
      height={GAME_HEIGHT}
      aria-label="Campo da Batalha de Torres"
      className="aspect-[4/3] w-full max-w-4xl rounded-xl border-2 border-[#4a4563] bg-[#0d0b1a] shadow-2xl shadow-purple-950"
    />
  );
}
