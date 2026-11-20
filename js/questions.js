/**
 * Banco fijo. Cada categoría tiene 100 preguntas: 25 por dificultad.
 * No se generan durante la partida.
 */

import { groups as historia } from "./data/historia.js";
import { groups as geografia } from "./data/geografia.js";
import { groups as ciencia } from "./data/ciencia.js";
import { groups as naturaleza } from "./data/naturaleza.js";
import { groups as tecnologia } from "./data/tecnologia.js";
import { groups as arte } from "./data/arte.js";
import { groups as cine } from "./data/cine.js";
import { groups as musica } from "./data/musica.js";
import { groups as deportes } from "./data/deportes.js";
import { groups as cultura } from "./data/cultura.js";
import { groups as gastronomia } from "./data/gastronomia.js";
import { groups as curiosidades } from "./data/curiosidades.js";

const BANKS = [
  ["Historia", "historia", historia],
  ["Geografía", "geografia", geografia],
  ["Ciencia", "ciencia", ciencia],
  ["Naturaleza", "naturaleza", naturaleza],
  ["Tecnología", "tecnologia", tecnologia],
  ["Arte y literatura", "arte", arte],
  ["Cine y televisión", "cine", cine],
  ["Música", "musica", musica],
  ["Deportes", "deportes", deportes],
  ["Cultura general", "cultura", cultura],
  ["Gastronomía", "gastronomia", gastronomia],
  ["Curiosidades", "curiosidades", curiosidades],
];

const LEVELS = ["facil", "medio", "dificil", "experto"];

export const QUESTIONS = BANKS.flatMap(([category, slug, bank]) =>
  LEVELS.flatMap((difficulty) => {
    const list = bank[difficulty];
    if (!list || list.length !== 25) {
      throw new Error(`${category} / ${difficulty}: ${list?.length ?? 0}`);
    }
    return list.map(([question, answer], index) => ({
      id: `${difficulty}-${slug}-${index + 1}`,
      category,
      difficulty,
      question,
      answer,
    }));
  }),
);

function assertBank() {
  const ids = new Set();
  const texts = new Set();

  for (const item of QUESTIONS) {
    if (!item.id || !item.category || !item.difficulty || !item.question || !item.answer) {
      throw new Error(`Pregunta incompleta: ${item.id || "(sin id)"}`);
    }
    if (!item.question.endsWith("?")) {
      throw new Error(`La pregunta no termina en interrogación: ${item.id}`);
    }
    if (ids.has(item.id)) throw new Error(`Id duplicado: ${item.id}`);
    if (texts.has(item.question)) throw new Error(`Pregunta repetida: ${item.question}`);
    ids.add(item.id);
    texts.add(item.question);
  }

  if (QUESTIONS.length !== 1200) {
    throw new Error(`El banco tiene ${QUESTIONS.length} preguntas.`);
  }

  for (const [category] of BANKS) {
    const count = QUESTIONS.filter((item) => item.category === category).length;
    if (count !== 100) throw new Error(`${category}: ${count}`);
  }

  for (const level of LEVELS) {
    const count = QUESTIONS.filter((item) => item.difficulty === level).length;
    if (count !== 300) throw new Error(`${level}: ${count}`);
  }
}

assertBank();

const BY_ID = new Map(QUESTIONS.map((item) => [item.id, item]));

export function getQuestionById(id) {
  return BY_ID.get(id) ?? null;
}

export function shuffle(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export function drawQuestionIds(difficulty, count, bagIds = []) {
  const pool = QUESTIONS.filter((item) => item.difficulty === difficulty);
  if (pool.length < count) return null;

  const poolIds = pool.map((item) => item.id);
  const poolSet = new Set(poolIds);
  let bag = [...new Set((bagIds || []).filter((id) => poolSet.has(id)))];
  if (bag.length === 0) bag = [...poolIds];

  const shuffled = shuffle(bag);
  if (shuffled.length >= count) {
    return {
      ids: shuffled.slice(0, count),
      bag: shuffled.slice(count),
    };
  }

  const picked = [...shuffled];
  const used = new Set(picked);
  const refill = shuffle(poolIds.filter((id) => !used.has(id)));
  const need = count - picked.length;

  return {
    ids: [...picked, ...refill.slice(0, need)],
    bag: refill.slice(need),
  };
}
