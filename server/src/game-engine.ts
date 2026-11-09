import { GAME_HEIGHT, GAME_WIDTH, type BallState, type PaddleDirection, type PaddleState, type ScoreState } from "@arena/shared";

export const TICK_RATE = 30;
export const TICK_SECONDS = 1 / TICK_RATE;
export const WINNING_SCORE = 5;

const PADDLE_WIDTH = 16;
const PADDLE_HEIGHT = 112;
const PADDLE_SPEED = 420;
const BALL_RADIUS = 10;
const BALL_SPEED_X = 360;
const BALL_SPEED_Y = 210;

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

/** Cria um estado novo sem qualquer dependência de rede ou relógio. */
export function createInitialGameState(serveTo: "PLAYER_ONE" | "PLAYER_TWO" = "PLAYER_TWO"): AuthoritativeGameState {
  const paddleY = (GAME_HEIGHT - PADDLE_HEIGHT) / 2;
  return {
    paddles: {
      playerOne: { x: 30, y: paddleY, width: PADDLE_WIDTH, height: PADDLE_HEIGHT },
      playerTwo: { x: GAME_WIDTH - 30 - PADDLE_WIDTH, y: paddleY, width: PADDLE_WIDTH, height: PADDLE_HEIGHT },
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

/** Reinicia somente o saque, preservando o placar autoritativo atual. */
export function createNextRound(game: AuthoritativeGameState, serveTo: "PLAYER_ONE" | "PLAYER_TWO"): AuthoritativeGameState {
  return { ...createInitialGameState(serveTo), score: { ...game.score } };
}

/** Aplica um tick da física e informa se a bola saiu do campo. */
export function advanceGame(game: AuthoritativeGameState, inputs: PlayerInputs, deltaSeconds: number): TickResult {
  const playerOne = movePaddle(game.paddles.playerOne, inputs.playerOne, deltaSeconds);
  const playerTwo = movePaddle(game.paddles.playerTwo, inputs.playerTwo, deltaSeconds);
  let ball = {
    ...game.ball,
    x: game.ball.x + game.ball.velocityX * deltaSeconds,
    y: game.ball.y + game.ball.velocityY * deltaSeconds,
  };

  if (ball.y - ball.radius <= 0) {
    ball = { ...ball, y: ball.radius, velocityY: Math.abs(ball.velocityY) };
  } else if (ball.y + ball.radius >= GAME_HEIGHT) {
    ball = { ...ball, y: GAME_HEIGHT - ball.radius, velocityY: -Math.abs(ball.velocityY) };
  }

  if (ball.velocityX < 0 && intersectsPaddle(ball, playerOne)) {
    ball = { ...ball, x: playerOne.x + playerOne.width + ball.radius, velocityX: Math.abs(ball.velocityX) };
  } else if (ball.velocityX > 0 && intersectsPaddle(ball, playerTwo)) {
    ball = { ...ball, x: playerTwo.x - ball.radius, velocityX: -Math.abs(ball.velocityX) };
  }

  if (ball.x + ball.radius < 0) {
    return { game: { paddles: { playerOne, playerTwo }, ball, score: { ...game.score } }, pointWinner: "PLAYER_TWO" };
  }
  if (ball.x - ball.radius > GAME_WIDTH) {
    return { game: { paddles: { playerOne, playerTwo }, ball, score: { ...game.score } }, pointWinner: "PLAYER_ONE" };
  }
  return { game: { paddles: { playerOne, playerTwo }, ball, score: { ...game.score } }, pointWinner: null };
}

export function addPoint(game: AuthoritativeGameState, winner: Exclude<PointWinner, null>): AuthoritativeGameState {
  return {
    ...game,
    score: {
      playerOne: game.score.playerOne + Number(winner === "PLAYER_ONE"),
      playerTwo: game.score.playerTwo + Number(winner === "PLAYER_TWO"),
    },
  };
}

function movePaddle(paddle: PaddleState, direction: PaddleDirection, deltaSeconds: number): PaddleState {
  const verticalMultiplier = direction === "UP" ? -1 : direction === "DOWN" ? 1 : 0;
  const y = Math.max(0, Math.min(GAME_HEIGHT - paddle.height, paddle.y + verticalMultiplier * PADDLE_SPEED * deltaSeconds));
  return { ...paddle, y };
}

function intersectsPaddle(ball: AuthoritativeGameState["ball"], paddle: PaddleState): boolean {
  return ball.x + ball.radius >= paddle.x
    && ball.x - ball.radius <= paddle.x + paddle.width
    && ball.y + ball.radius >= paddle.y
    && ball.y - ball.radius <= paddle.y + paddle.height;
}
