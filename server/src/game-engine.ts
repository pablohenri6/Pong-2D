import { GAME_HEIGHT, GAME_WIDTH, type BallState, type PaddleDirection, type PaddleState, type ScoreState } from "@arena/shared";

export const TICK_RATE = 30;
export const TICK_SECONDS = 1 / TICK_RATE;
export const WINNING_SCORE = 5;

// Dimensões e velocidades dos escudos e bola de fogo
const PADDLE_WIDTH = 16;
const PADDLE_HEIGHT = 112;
const PADDLE_SPEED = 420;
const BALL_RADIUS = 10;
const BALL_SPEED_X = 360;
const BALL_SPEED_Y = 210;

// Velocidade vertical máxima ao rebater na ponta do escudo
const MAX_BOUNCE_VY = 480;

// Distância da parede até a torre de pedra (área útil do campo)
const TOWER_OFFSET = 55;

export interface AuthoritativeGameState {
  paddles: { playerOne: PaddleState; playerTwo: PaddleState };
  ball: BallState & { velocityX: number; velocityY: number };
  score: ScoreState;
}

export interface PlayerInputs {
  playerOne: PaddleDirection;
  playerTwo: PaddleDirection;
}

export type PointWinner = "PLAYER_ONE" | "PLAYER_TWO" | null;

export interface TickResult {
  game: AuthoritativeGameState;
  pointWinner: PointWinner;
}

/** Calcula a vida do castelo a partir da pontuação atual. */
function healthFromScore(score: number): number {
  return Math.max(0, 100 - score * (100 / WINNING_SCORE));
}

/** Cria um estado novo sem qualquer dependência de rede ou relógio. */
export function createInitialGameState(serveTo: "PLAYER_ONE" | "PLAYER_TWO" = "PLAYER_TWO"): AuthoritativeGameState {
  const paddleY = (GAME_HEIGHT - PADDLE_HEIGHT) / 2;
  return {
    paddles: {
      playerOne: { x: TOWER_OFFSET + 15, y: paddleY, width: PADDLE_WIDTH, height: PADDLE_HEIGHT, health: 100 },
      playerTwo: { x: GAME_WIDTH - TOWER_OFFSET - 15 - PADDLE_WIDTH, y: paddleY, width: PADDLE_WIDTH, height: PADDLE_HEIGHT, health: 100 },
    },
    ball: {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      radius: BALL_RADIUS,
      velocityX: serveTo === "PLAYER_TWO" ? BALL_SPEED_X : -BALL_SPEED_X,
      velocityY: BALL_SPEED_Y,
    },
    score: { playerOne: 0, playerTwo: 0 },
  };
}

/** Reinicia somente o saque, preservando o placar e a vida dos castelos. */
export function createNextRound(game: AuthoritativeGameState, serveTo: "PLAYER_ONE" | "PLAYER_TWO"): AuthoritativeGameState {
  const fresh = createInitialGameState(serveTo);
  return {
    ...fresh,
    score: { ...game.score },
    paddles: {
      playerOne: { ...fresh.paddles.playerOne, health: game.paddles.playerOne.health },
      playerTwo: { ...fresh.paddles.playerTwo, health: game.paddles.playerTwo.health },
    },
  };
}

/** Aplica um tick da física da bola de fogo e escudos. */
export function advanceGame(game: AuthoritativeGameState, inputs: PlayerInputs, deltaSeconds: number): TickResult {
  const playerOne = movePaddle(game.paddles.playerOne, inputs.playerOne, deltaSeconds);
  const playerTwo = movePaddle(game.paddles.playerTwo, inputs.playerTwo, deltaSeconds);
  let ball = {
    ...game.ball,
    x: game.ball.x + game.ball.velocityX * deltaSeconds,
    y: game.ball.y + game.ball.velocityY * deltaSeconds,
  };

  // 1. Colisão com o teto e chão fortificados
  if (ball.y - ball.radius <= 15) {
    ball = { ...ball, y: 15 + ball.radius, velocityY: Math.abs(ball.velocityY) };
  } else if (ball.y + ball.radius >= GAME_HEIGHT - 15) {
    ball = { ...ball, y: GAME_HEIGHT - 15 - ball.radius, velocityY: -Math.abs(ball.velocityY) };
  }

  // 2. Colisão da bola de fogo com os Escudos Heráldicos
  //    O ângulo de saída varia conforme onde a bola acerta o escudo:
  //    centro → rebate reto; pontas → rebate em ângulo mais fechado.
  if (ball.velocityX < 0 && intersectsPaddle(ball, playerOne)) {
    const hitFactor = (ball.y - (playerOne.y + playerOne.height / 2)) / (playerOne.height / 2);
    const newVy = hitFactor * MAX_BOUNCE_VY;
    ball = { ...ball, x: playerOne.x + playerOne.width + ball.radius, velocityX: Math.abs(ball.velocityX), velocityY: newVy };
  } else if (ball.velocityX > 0 && intersectsPaddle(ball, playerTwo)) {
    const hitFactor = (ball.y - (playerTwo.y + playerTwo.height / 2)) / (playerTwo.height / 2);
    const newVy = hitFactor * MAX_BOUNCE_VY;
    ball = { ...ball, x: playerTwo.x - ball.radius, velocityX: -Math.abs(ball.velocityX), velocityY: newVy };
  }

  // 3. Verificação de Ponto (Dano atingido nas Torres de Defesa)
  if (ball.x + ball.radius < TOWER_OFFSET) {
    return { game: { paddles: { playerOne, playerTwo }, ball, score: { ...game.score } }, pointWinner: "PLAYER_TWO" };
  }
  if (ball.x - ball.radius > GAME_WIDTH - TOWER_OFFSET) {
    return { game: { paddles: { playerOne, playerTwo }, ball, score: { ...game.score } }, pointWinner: "PLAYER_ONE" };
  }

  return { game: { paddles: { playerOne, playerTwo }, ball, score: { ...game.score } }, pointWinner: null };
}

export function addPoint(game: AuthoritativeGameState, winner: Exclude<PointWinner, null>): AuthoritativeGameState {
  const newScore = {
    playerOne: game.score.playerOne + Number(winner === "PLAYER_ONE"),
    playerTwo: game.score.playerTwo + Number(winner === "PLAYER_TWO"),
  };
  return {
    ...game,
    score: newScore,
    paddles: {
      playerOne: { ...game.paddles.playerOne, health: healthFromScore(newScore.playerOne) },
      playerTwo: { ...game.paddles.playerTwo, health: healthFromScore(newScore.playerTwo) },
    },
  };
}

function movePaddle(paddle: PaddleState, direction: PaddleDirection, deltaSeconds: number): PaddleState {
  const verticalMultiplier = direction === "UP" ? -1 : direction === "DOWN" ? 1 : 0;
  const y = Math.max(15, Math.min(GAME_HEIGHT - 15 - paddle.height, paddle.y + verticalMultiplier * PADDLE_SPEED * deltaSeconds));
  return { ...paddle, y };
}

function intersectsPaddle(ball: AuthoritativeGameState["ball"], paddle: PaddleState): boolean {
  return ball.x + ball.radius >= paddle.x
    && ball.x - ball.radius <= paddle.x + paddle.width
    && ball.y + ball.radius >= paddle.y
    && ball.y - ball.radius <= paddle.y + paddle.height;
}
