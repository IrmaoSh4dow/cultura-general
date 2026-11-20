import { drawQuestionIds, getQuestionById } from "./questions.js";
import {
  TOTAL_TURNS,
  createGame,
  difficultyById,
  isValidGame,
  playerById,
  playerForTurn,
  playerQuestionNumber,
  registerAnswer,
  revealAnswer,
} from "./game.js";
import { clearGame, loadBag, loadGame, saveBag, saveGame } from "./storage.js";
import { renderApp, renderModal } from "./ui.js";

const appRoot = document.querySelector("#app");
const modalRoot = document.querySelector("#modal");
const liveRegion = document.querySelector("#live");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let saved = loadGame();
if (saved && !isValidGame(saved)) {
  clearGame();
  saved = null;
}

const app = {
  view: saved ? saved.view : "cover",
  game: saved,
  draftDifficulty: null,
  modal: null,
  motion: saved ? null : "screen",
  error: null,
};

let lastView = null;
let ignoreClicksUntil = 0;

function prefersReducedMotion() {
  return reduceMotion;
}

function announce(message) {
  if (!liveRegion) return;
  liveRegion.textContent = "";
  window.setTimeout(() => {
    liveRegion.textContent = message;
  }, 30);
}

function titleFor() {
  if (app.view === "difficulty") return "Elige la dificultad · Nuestro pequeño duelo";
  if (app.view === "results") return "Resultado · Nuestro pequeño duelo";
  if (app.view === "game" && app.game) {
    const name = playerById(playerForTurn(app.game.turn)).name;
    return `Turno de ${name} · Nuestro pequeño duelo`;
  }
  return "Nuestro pequeño duelo";
}

function draw(options = {}) {
  if (!options.modalOnly) {
    renderApp(appRoot, app);
    const behavior = prefersReducedMotion() ? "auto" : "smooth";

    if (app.view !== lastView) {
      window.scrollTo({ top: 0, behavior: "auto" });
      lastView = app.view;
    } else if (options.toTop) {
      window.scrollTo({ top: 0, behavior });
    } else if (options.reveal) {
      appRoot.querySelector(".answer")?.scrollIntoView({ behavior, block: "center" });
    }
  }

  renderModal(modalRoot, app);
  document.body.classList.toggle("modal-open", Boolean(app.modal));
  document.body.dataset.view = app.view;
  document.title = titleFor();
  app.motion = null;

  if (options.focus) {
    const scope = options.focusModal ? modalRoot : appRoot;
    scope.querySelector(options.focus)?.focus({ preventScroll: true });
  }
}

function persist() {
  if (app.game) saveGame(app.game);
  else clearGame();
}

function goCover() {
  app.game = null;
  app.view = "cover";
  app.modal = null;
  app.draftDifficulty = null;
  app.error = null;
  app.motion = "screen";
  persist();
  draw();
}

function openDifficulty() {
  app.view = "difficulty";
  app.error = null;
  app.motion = "screen";
  draw();
}

function selectDifficulty(id) {
  if (!difficultyById(id)) return;
  app.draftDifficulty = id;
  app.error = null;
  app.motion = null;
  draw();
}

function holdClicks(ms = 550) {
  ignoreClicksUntil = Date.now() + ms;
}

function begin() {
  if (!app.draftDifficulty) return;

  const bag = loadBag();
  const previous = bag[app.draftDifficulty] ?? [];
  const drawn = drawQuestionIds(app.draftDifficulty, TOTAL_TURNS, previous);

  if (!drawn) {
    app.error = "No hay suficientes preguntas para esta dificultad.";
    draw();
    return;
  }

  bag[app.draftDifficulty] = drawn.bag;
  saveBag(bag);

  app.game = createGame(app.draftDifficulty, drawn.ids);
  app.view = "game";
  app.modal = null;
  app.error = null;
  app.motion = "turn";
  persist();
  draw();

  const player = playerById(playerForTurn(0));
  const question = getQuestionById(app.game.questionIds[0]);
  announce(`Turno de ${player.name}. Pregunta 1 de 10. ${question.question}`);
}

function reveal() {
  const next = revealAnswer(app.game);
  if (next === app.game) return;

  app.game = next;
  app.motion = null;
  persist();
  draw({ reveal: true });

  const question = getQuestionById(app.game.questionIds[app.game.turn]);
  announce(`Respuesta correcta: ${question.answer}`);
}

function score(correct) {
  const next = registerAnswer(app.game, correct);
  if (next === app.game) return;

  app.game = next;
  app.view = next.view;
  app.motion = next.view === "results" ? "screen" : "turn";
  persist();
  draw({ toTop: next.view === "game" });

  if (next.view === "results") {
    announce("Fin del duelo.");
    return;
  }

  const player = playerById(playerForTurn(next.turn));
  const number = playerQuestionNumber(next.turn);
  const question = getQuestionById(next.questionIds[next.turn]);
  announce(`Turno de ${player.name}. Pregunta ${number} de 10. ${question.question}`);
}

function askAbandon() {
  if (!app.game || app.view !== "game") return;
  app.modal = "abandon";
  draw({
    modalOnly: true,
    focus: "[data-action='close-modal']",
    focusModal: true,
  });
}

function closeModal() {
  if (!app.modal) return;
  app.modal = null;
  draw({ modalOnly: true });
}

function returnUnplayedQuestions() {
  if (!app.game || app.view !== "game") return;

  const future = app.game.questionIds.slice(app.game.turn + 1);
  if (future.length === 0) return;

  const bag = loadBag();
  const level = app.game.difficulty;
  bag[level] = [...new Set([...(bag[level] ?? []), ...future])];
  saveBag(bag);
}

function confirmAbandon() {
  returnUnplayedQuestions();
  app.game = null;
  app.view = "difficulty";
  app.modal = null;
  app.draftDifficulty = null;
  app.error = null;
  app.motion = "screen";
  persist();
  draw();
  announce("Partida reiniciada.");
}

function replay() {
  app.game = null;
  app.view = "difficulty";
  app.modal = null;
  app.draftDifficulty = null;
  app.error = null;
  app.motion = "screen";
  persist();
  draw();
}

function onClick(event) {
  if (Date.now() < ignoreClicksUntil) return;

  const target = event.target.closest("[data-action]");
  if (!target || target.disabled) return;

  const action = target.dataset.action;
  if (!action || action === "stop") return;

  if (action === "correct" || action === "wrong") {
    holdClicks(400);
  }

  if (action === "open-difficulty") openDifficulty();
  else if (action === "home") goCover();
  else if (action === "select-difficulty") selectDifficulty(target.dataset.difficulty);
  else if (action === "begin") begin();
  else if (action === "reveal") reveal();
  else if (action === "correct") score(true);
  else if (action === "wrong") score(false);
  else if (action === "ask-abandon") askAbandon();
  else if (action === "close-modal") closeModal();
  else if (action === "confirm-abandon") confirmAbandon();
  else if (action === "replay") replay();
}

function onKeydown(event) {
  if (event.key === "Escape" && app.modal) closeModal();
}

document.addEventListener("click", onClick);
document.addEventListener("keydown", onKeydown);

draw();

if (app.view === "game" && app.game) {
  const player = playerById(playerForTurn(app.game.turn));
  const number = playerQuestionNumber(app.game.turn);
  const question = getQuestionById(app.game.questionIds[app.game.turn]);
  const prefix = app.game.phase === "revealed"
    ? `Respuesta correcta: ${question.answer}`
    : `Turno de ${player.name}. Pregunta ${number} de 10. ${question.question}`;
  announce(prefix);
}
