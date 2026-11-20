import { getQuestionById } from "./questions.js";

const GAME_KEY = "lv-duelo-partida";
const BAG_KEY = "lv-duelo-bolsa";
const LEVELS = ["facil", "medio", "dificil", "experto"];

export function emptyBag() {
  return { facil: [], medio: [], dificil: [], experto: [] };
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(GAME_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveGame(game) {
  try {
    localStorage.setItem(GAME_KEY, JSON.stringify(game));
  } catch {
    // La partida sigue en memoria si el navegador bloquea el almacenamiento.
  }
}

export function clearGame() {
  try {
    localStorage.removeItem(GAME_KEY);
  } catch {
    // Nada que recuperar si el almacenamiento no está disponible.
  }
}

export function loadBag() {
  const bag = emptyBag();

  try {
    const raw = localStorage.getItem(BAG_KEY);
    if (!raw) return bag;
    const parsed = JSON.parse(raw);

    for (const level of LEVELS) {
      const list = Array.isArray(parsed?.[level]) ? parsed[level] : [];
      bag[level] = [...new Set(list.filter((id) => {
        const question = getQuestionById(id);
        return question && question.difficulty === level;
      }))];
    }
  } catch {
    return emptyBag();
  }

  return bag;
}

export function saveBag(bag) {
  try {
    localStorage.setItem(BAG_KEY, JSON.stringify(bag));
  } catch {
    // Si no se puede recordar el historial, la siguiente partida igual será aleatoria.
  }
}
