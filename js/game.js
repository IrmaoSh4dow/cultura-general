import { getQuestionById } from "./questions.js";

export const SAVE_VERSION = 1;
export const QUESTIONS_PER_PLAYER = 10;
export const TOTAL_TURNS = QUESTIONS_PER_PLAYER * 2;

export const PLAYERS = [
  { id: "valentina", name: "Valentina" },
  { id: "luke", name: "Luke" },
];

export const DIFFICULTIES = [
  {
    id: "facil",
    label: "Fácil",
    level: "I",
    description: "Preguntas de conocimiento general básico.",
  },
  {
    id: "medio",
    label: "Medio",
    level: "II",
    description: "Preguntas que requieren algo más de conocimiento.",
  },
  {
    id: "dificil",
    label: "Difícil",
    level: "III",
    description: "Preguntas más específicas y desafiantes.",
  },
  {
    id: "experto",
    label: "Experto",
    level: "IV",
    description: "Preguntas complicadas para poner a prueba nuestros conocimientos.",
  },
];

export function playerForTurn(turn) {
  return turn % 2 === 0 ? "valentina" : "luke";
}

export function playerQuestionNumber(turn) {
  return Math.floor(turn / 2) + 1;
}

export function playerById(id) {
  return PLAYERS.find((player) => player.id === id) ?? null;
}

export function difficultyById(id) {
  return DIFFICULTIES.find((item) => item.id === id) ?? null;
}

export function createGame(difficulty, questionIds) {
  return {
    version: SAVE_VERSION,
    view: "game",
    difficulty,
    questionIds,
    turn: 0,
    phase: "ask",
    history: [],
  };
}

export function revealAnswer(game) {
  if (!game || game.view !== "game" || game.phase !== "ask") return game;
  return { ...game, phase: "revealed" };
}

export function registerAnswer(game, correct) {
  if (!game || game.view !== "game" || game.phase !== "revealed") return game;
  if (game.history.some((item) => item.turn === game.turn)) return game;

  const history = [
    ...game.history,
    {
      turn: game.turn,
      player: playerForTurn(game.turn),
      questionId: game.questionIds[game.turn],
      correct: Boolean(correct),
    },
  ];

  const finished = history.length >= TOTAL_TURNS;

  return {
    ...game,
    history,
    view: finished ? "results" : "game",
    turn: finished ? game.turn : game.turn + 1,
    phase: finished ? "done" : "ask",
  };
}

export function scoresFrom(history) {
  const scores = {
    valentina: { correct: 0, wrong: 0 },
    luke: { correct: 0, wrong: 0 },
  };

  for (const item of history) {
    const bucket = scores[item.player];
    if (!bucket) continue;
    bucket[item.correct ? "correct" : "wrong"] += 1;
  }

  return scores;
}

export function accuracy(score) {
  const total = score.correct + score.wrong;
  if (total === 0) return 0;
  return Math.round((score.correct / total) * 100);
}

export function winnerOf(game) {
  const scores = scoresFrom(game.history);
  if (scores.valentina.correct > scores.luke.correct) return "valentina";
  if (scores.luke.correct > scores.valentina.correct) return "luke";
  return "tie";
}

export function isValidGame(game) {
  if (!game || game.version !== SAVE_VERSION) return false;
  if (game.view !== "game" && game.view !== "results") return false;
  if (!difficultyById(game.difficulty)) return false;
  if (!Array.isArray(game.questionIds) || game.questionIds.length !== TOTAL_TURNS) return false;
  if (new Set(game.questionIds).size !== TOTAL_TURNS) return false;

  for (const id of game.questionIds) {
    const question = getQuestionById(id);
    if (!question || question.difficulty !== game.difficulty) return false;
  }

  if (!Array.isArray(game.history)) return false;

  if (game.view === "results") {
    if (game.history.length !== TOTAL_TURNS) return false;
  } else {
    if (!Number.isInteger(game.turn) || game.turn < 0 || game.turn >= TOTAL_TURNS) return false;
    if (game.phase !== "ask" && game.phase !== "revealed") return false;
    if (game.history.length !== game.turn) return false;
  }

  for (let index = 0; index < game.history.length; index += 1) {
    const item = game.history[index];
    if (!item || item.turn !== index) return false;
    if (item.player !== playerForTurn(index)) return false;
    if (item.questionId !== game.questionIds[index]) return false;
    if (typeof item.correct !== "boolean") return false;
  }

  return true;
}
