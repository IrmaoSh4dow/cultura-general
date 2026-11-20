import { getQuestionById } from "./questions.js";
import {
  DIFFICULTIES,
  PLAYERS,
  QUESTIONS_PER_PLAYER,
  TOTAL_TURNS,
  accuracy,
  difficultyById,
  playerById,
  playerForTurn,
  playerQuestionNumber,
  scoresFrom,
  winnerOf,
} from "./game.js";

const COPY = {
  title: "Nuestro pequeño duelo",
  intro: "Sé que te encanta ganar, y a mí me encanta ganarte, por eso hice esto para los dos.",
  complement: "Dos mentes, dos corazones y una sola misión: demostrar quién sabe más. Aunque, siendo sinceros, perder contigo tampoco está tan mal.",
  start: "Comenzar el duelo ❤️",
  tie: "¡Empate! Parece que estamos demasiado bien hechos el uno para el otro. ❤️",
  valentina: "¡La reina del conocimiento! Luke tendrá que estudiar un poquito más.",
  luke: "¡Luke se lleva la victoria! Pero ganar el corazón de Valentina sigue siendo su mayor logro.",
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plural(count, singular, pluralLabel) {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

function brand() {
  return `<p class="brand">Luke <span>&</span> Valentina</p>`;
}

function ornament() {
  return `<div class="ornament" aria-hidden="true"><span></span><i>♥</i><span></span></div>`;
}

function hearts() {
  const pieces = [
    [6, 0], [14, 1.4], [23, 0.5], [31, 2.2], [40, 0.9], [49, 1.7],
    [58, 0.2], [67, 1.2], [75, 2.5], [83, 0.7], [91, 1.9], [97, 0.4],
  ];

  const marks = pieces
    .map(([left, delay]) => `<span style="left:${left}%;animation-delay:${delay}s">♥</span>`)
    .join("");

  return `<div class="rise-hearts" aria-hidden="true">${marks}</div>`;
}

function cover() {
  return `
    <section class="screen screen-cover${screenMotion()}">
      ${brand()}
      <p class="eyebrow">Un concurso para dos</p>
      <h1>${COPY.title}</h1>
      <p class="lede">${COPY.intro}</p>
      ${ornament()}
      <p class="aside-copy">${COPY.complement}</p>
      <button class="btn btn-gold" type="button" data-action="open-difficulty">${COPY.start}</button>
      <p class="signature">Para jugar los dos, en este mismo dispositivo.</p>
    </section>
  `;
}

function screenMotion() {
  return appMotion === "screen" ? " is-entering" : "";
}

let appMotion = null;

function difficultyScreen(app) {
  const cards = DIFFICULTIES.map((item) => {
    const selected = app.draftDifficulty === item.id;
    return `
      <button
        class="panel diff-card${selected ? " is-selected" : ""}"
        type="button"
        data-action="select-difficulty"
        data-difficulty="${item.id}"
        aria-pressed="${selected ? "true" : "false"}"
      >
        <span class="diff-level">${item.level}</span>
        <span class="diff-name">${item.label}</span>
        <span class="diff-copy">${item.description}</span>
        ${selected ? `<span class="chosen">Elegida</span>` : ""}
      </button>
    `;
  }).join("");

  return `
    <section class="screen screen-difficulty${screenMotion()}">
      ${brand()}
      <p class="eyebrow">Antes de empezar</p>
      <h1>Elige la dificultad</h1>
      <p class="aside-copy">La misma para los dos, durante toda la partida. Son 10 preguntas cada uno y empieza Valentina.</p>
      <div class="diff-grid">${cards}</div>
      ${app.error ? `<p class="form-error" role="alert">${escapeHtml(app.error)}</p>` : ""}
      <div class="stack-actions">
        <button class="btn btn-gold" type="button" data-action="begin" ${app.draftDifficulty ? "" : "disabled"}>
          Comenzar el duelo
        </button>
        <button class="btn btn-quiet" type="button" data-action="home">Volver a la portada</button>
      </div>
    </section>
  `;
}

function scoreboard(game) {
  const scores = scoresFrom(game.history);
  const active = game.view === "game" ? playerForTurn(game.turn) : null;
  const last = game.history[game.history.length - 1];
  const bumped = appMotion === "turn" ? last?.player : null;

  const cards = PLAYERS.map((player) => {
    const score = scores[player.id];
    const isActive = active === player.id;
    return `
      <article
        class="panel score-card ${player.id}${isActive ? " is-active" : ""}${bumped === player.id ? " did-score" : ""}"
        data-active="${isActive ? "true" : "false"}"
        aria-label="${player.name}: ${plural(score.correct, "acierto", "aciertos")}, ${plural(score.wrong, "error", "errores")}, ${accuracy(score)}% de precisión"
      >
        <div class="score-top">
          <p class="score-name">${player.name}</p>
          ${isActive ? `<span class="live-chip">En turno</span>` : ""}
        </div>
        <p class="points">${score.correct}</p>
        <p class="points-label">${score.correct === 1 ? "acierto" : "aciertos"}</p>
        <p class="score-meta">${plural(score.wrong, "error", "errores")} · ${accuracy(score)}%</p>
      </article>
    `;
  }).join("");

  return `<div class="score-wrap">${cards}</div>`;
}

function dots(turn) {
  const current = playerQuestionNumber(turn);
  const marks = Array.from({ length: QUESTIONS_PER_PLAYER }, (_, index) => {
    const number = index + 1;
    const state = number < current ? "is-done" : number === current ? "is-now" : "";
    return `<span class="${state}"></span>`;
  }).join("");

  return `<div class="dots" aria-hidden="true">${marks}</div>`;
}

function matchbar(game) {
  const done = game.history.length;
  const width = (done / TOTAL_TURNS) * 100;
  return `
    <div class="matchbar" role="progressbar" aria-valuemin="0" aria-valuemax="${TOTAL_TURNS}" aria-valuenow="${done}" aria-label="Preguntas completadas de la partida">
      <span style="width:${width}%"></span>
    </div>
  `;
}

function gameScreen(app) {
  const game = app.game;
  const player = playerById(playerForTurn(game.turn));
  const question = getQuestionById(game.questionIds[game.turn]);
  const difficulty = difficultyById(game.difficulty);
  const number = playerQuestionNumber(game.turn);

  if (!player || !question || !difficulty) {
    return `
      <section class="screen screen-difficulty">
        ${brand()}
        <h1>Esta partida no se puede continuar.</h1>
        <p class="aside-copy">El progreso guardado no encaja con las preguntas actuales.</p>
        <div class="stack-actions">
          <button class="btn btn-gold" type="button" data-action="confirm-abandon">Empezar de nuevo</button>
        </div>
      </section>
    `;
  }
  const revealed = game.phase === "revealed";
  const entering = appMotion === "turn" ? " is-entering" : "";

  const answerBlock = revealed
    ? `
      <div class="answer">
        <span class="answer-label">Respuesta correcta</span>
        <p class="answer-text">${escapeHtml(question.answer)}</p>
      </div>
      <div class="choice-row">
        <button class="btn btn-wine" type="button" data-action="correct">¡Acerté!</button>
        <button class="btn btn-line" type="button" data-action="wrong">No acerté 😢</button>
      </div>
    `
    : `<button class="btn btn-wine btn-wide" type="button" data-action="reveal">Revelar respuesta</button>`;

  return `
    <section class="screen screen-game">
      ${brand()}
      ${scoreboard(game)}
      ${matchbar(game)}
      <article class="panel card question-card${entering}" data-player="${player.id}">
        <p class="turn-kicker">Turno de</p>
        <h1 class="turn-name">${player.name}</h1>
        ${dots(game.turn)}
        <div class="meta">
          <span class="pill">${escapeHtml(difficulty.label)}</span>
          <span class="pill">Pregunta ${number} de ${QUESTIONS_PER_PLAYER}</span>
          <span class="pill">${escapeHtml(question.category)}</span>
        </div>
        <p class="prompt">${escapeHtml(question.question)}</p>
        ${answerBlock}
      </article>
      <button class="btn btn-quiet" type="button" data-action="ask-abandon">Abandonar partida</button>
      <p class="signature">La partida se guarda sola en este dispositivo.</p>
    </section>
  `;
}

function resultCard(player, score, winner) {
  const isWinner = winner === player.id;
  const chip = isWinner
    ? `<p class="winner-chip">${player.id === "valentina" ? "Ganadora" : "Ganador"}</p>`
    : "";

  return `
    <article class="panel result-card${isWinner ? " is-winner" : ""}">
      ${chip}
      <p class="score-name">${player.name}</p>
      <p class="points">${score.correct}</p>
      <p class="points-label">${score.correct === 1 ? "acierto" : "aciertos"} de ${QUESTIONS_PER_PLAYER}</p>
      <p class="score-meta">${plural(score.wrong, "error", "errores")}</p>
      <p class="score-meta">${accuracy(score)}% de precisión</p>
    </article>
  `;
}

function resultsScreen(app) {
  const game = app.game;
  const winner = winnerOf(game);
  const scores = scoresFrom(game.history);
  const difficulty = difficultyById(game.difficulty);
  const kicker = winner === "tie" ? "Empate" : `Gana ${playerById(winner).name}`;
  const message = COPY[winner];

  const cards = PLAYERS
    .map((player) => resultCard(player, scores[player.id], winner))
    .join("");

  return `
    <section class="screen screen-results${screenMotion()}">
      ${brand()}
      <p class="eyebrow">${kicker}</p>
      <h1 class="finale">${escapeHtml(message)}</h1>
      ${ornament()}
      <p class="aside-copy">Dificultad ${escapeHtml(difficulty.label)} · 10 preguntas cada uno</p>
      <div class="result-grid">${cards}</div>
      <div class="result-actions">
        <button class="btn btn-gold" type="button" data-action="replay">Volver a jugar</button>
        <button class="btn btn-ghost" type="button" data-action="home">Regresar a la portada</button>
      </div>
    </section>
  `;
}

function screenFor(app) {
  if (app.view === "difficulty") return difficultyScreen(app);
  if (app.view === "game" && app.game) return gameScreen(app);
  if (app.view === "results" && app.game) return resultsScreen(app);
  return cover();
}

export function renderApp(root, app) {
  appMotion = app.motion;
  const celebration = app.view === "results" ? hearts() : "";
  root.innerHTML = `${celebration}<div class="shell">${screenFor(app)}</div>`;
}

export function renderModal(root, app) {
  if (app.modal !== "abandon") {
    root.hidden = true;
    root.innerHTML = "";
    return;
  }

  root.hidden = false;
  root.innerHTML = `
    <div class="modal-fill">
      <div class="panel modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title" data-action="stop">
        <p class="eyebrow dark">Un momento</p>
        <h2 id="modal-title">¿Abandonar la partida?</h2>
        <p class="modal-copy">Se borrará el progreso y los contadores volverán a cero. Después podrán empezar otro duelo.</p>
        <div class="modal-actions">
          <button class="btn btn-wine" type="button" data-action="close-modal">Seguir jugando</button>
          <button class="btn btn-line" type="button" data-action="confirm-abandon">Abandonar y reiniciar</button>
        </div>
      </div>
    </div>
  `;
}
