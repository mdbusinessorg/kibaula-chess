// INP CHESS — motor de xadrez partilhado
// Negamax alpha-beta simples sobre chess.js + classificação de jogadas
// estilo "coach" (melhor/brilhante/boa/imprecisão/erro/grave).

import { Chess } from 'chess.js';

export const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// ---- tabelas posicionais simples (perspectiva das brancas) ----
const PAWN = [
  0, 0, 0, 0, 0, 0, 0, 0,
  .5, .5, .5, .5, .5, .5, .5, .5,
  .1, .1, .2, .3, .3, .2, .1, .1,
  .05, .05, .1, .25, .25, .1, .05, .05,
  0, 0, 0, .2, .2, 0, 0, 0,
  .05, -.05, -.1, 0, 0, -.1, -.05, .05,
  .05, .1, .1, -.2, -.2, .1, .1, .05,
  0, 0, 0, 0, 0, 0, 0, 0,
];
const KNIGHT = [
  -.5, -.4, -.3, -.3, -.3, -.3, -.4, -.5,
  -.4, -.2, 0, 0, 0, 0, -.2, -.4,
  -.3, 0, .1, .15, .15, .1, 0, -.3,
  -.3, .05, .15, .2, .2, .15, .05, -.3,
  -.3, 0, .15, .2, .2, .15, 0, -.3,
  -.3, .05, .1, .15, .15, .1, .05, -.3,
  -.4, -.2, 0, .05, .05, 0, -.2, -.4,
  -.5, -.4, -.3, -.3, -.3, -.3, -.4, -.5,
];
const CENTER = [
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, .05, .05, 0, 0, 0,
  0, 0, .1, .2, .2, .1, 0, 0,
  0, .05, .2, .3, .3, .2, .05, 0,
  0, .05, .2, .3, .3, .2, .05, 0,
  0, 0, .1, .2, .2, .1, 0, 0,
  0, 0, 0, .05, .05, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
];

function squareIdx(sq: string): number {
  // sq tipo 'e4' → índice 0..63 com a8=0 (como o board() do chess.js)
  const file = sq.charCodeAt(0) - 97;
  const rank = 8 - (sq.charCodeAt(1) - 48);
  return rank * 8 + file;
}

function positional(type: string, sq: string, color: string): number {
  const i = squareIdx(sq);
  const idx = color === 'w' ? i : 63 - i;
  if (type === 'p') return PAWN[idx];
  if (type === 'n' || type === 'b') return KNIGHT[idx] * .8;
  if (type === 'r' || type === 'q') return CENTER[idx] * .5;
  return 0;
}

/** Avaliação material+posicional, perspectiva das brancas (+ = melhor p/ brancas). */
export function evalBoard(g: Chess): number {
  let s = 0;
  for (const row of g.board()) for (const c of row) {
    if (!c) continue;
    const v = VAL[c.type] + positional(c.type, c.square, c.color);
    s += v * (c.color === 'w' ? 1 : -1);
  }
  return s;
}

export function negamax(g: Chess, depth: number, alpha: number, beta: number): number {
  // devolve avaliação na perspectiva do lado que joga (+ = bom para quem move)
  if (depth === 0 || g.isGameOver()) {
    if (g.isCheckmate()) return -10000;
    if (g.isDraw() || g.isStalemate()) return 0;
    return evalBoard(g) * (g.turn() === 'w' ? 1 : -1);
  }
  let best = -Infinity;
  for (const m of g.moves()) {
    g.move(m);
    best = Math.max(best, -negamax(g, depth - 1, -beta, -alpha));
    g.undo();
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** Melhor jogada a uma profundidade (lan, ex. 'e2e4'). */
export function bestMove(g: Chess, depth: number): string | null {
  const moves = g.moves({ verbose: true });
  if (!moves.length) return null;
  let best = -Infinity;
  let chosen: string[] = [];
  for (const m of moves) {
    g.move(m);
    const score = -negamax(g, depth - 1, -Infinity, Infinity);
    g.undo();
    if (score > best) { best = score; chosen = [m.lan]; }
    else if (score === best) chosen.push(m.lan);
  }
  return chosen[Math.floor(Math.random() * chosen.length)] ?? null;
}

/** Força do bot calibrada por rating 500–3000. */
export function botMove(g: Chess, rating: number): string | null {
  const moves = g.moves({ verbose: true });
  if (!moves.length) return null;
  const depth = rating >= 2200 ? 3 : rating >= 1300 ? 2 : 1;
  const blunder = Math.max(0, (3000 - rating) / 3000) * 0.5;
  if (depth === 1) {
    if (Math.random() < blunder) {
      return moves[Math.floor(Math.random() * moves.length)].lan;
    }
    const good = moves.filter((m) => m.captured || m.san.includes('+') || m.san.includes('#'));
    const pick = good.length ? good : moves;
    return pick[Math.floor(Math.random() * pick.length)].lan;
  }
  if (Math.random() < blunder) {
    return moves[Math.floor(Math.random() * moves.length)].lan;
  }
  return bestMove(g, depth);
}

// ---- níveis de bot nomeados ----
export type BotLevel = { name: string; rating: number; icon: string; desc: string };

export const BOT_LEVELS: BotLevel[] = [
  { name: 'Iniciante',     rating: 500,  icon: '🐣', desc: 'Aprende as regras contigo' },
  { name: 'Aprendiz',      rating: 800,  icon: '📗', desc: 'Já vê capturas simples' },
  { name: 'Intermediário', rating: 1200, icon: '🧠', desc: 'Joga com um plano curto' },
  { name: 'Avançado',      rating: 1600, icon: '⚔️', desc: 'Calcula 2 jogadas à frente' },
  { name: 'Especialista',  rating: 2000, icon: '🎯', desc: 'Erros custam caro' },
  { name: 'Mestre',        rating: 2400, icon: '🏆', desc: 'Visão táctica profunda' },
  { name: 'Elite',         rating: 2750, icon: '💎', desc: 'Quase perfeito' },
  { name: 'INP Champion',  rating: 3000, icon: '👑', desc: 'O melhor do INP' },
];

export function botForRating(rating: number): BotLevel {
  let b = BOT_LEVELS[0];
  for (const l of BOT_LEVELS) if (rating >= l.rating) b = l;
  return b;
}

// ---- classificação de jogadas (coach) ----
export type MoveClass =
  | 'brilliant' | 'best' | 'good' | 'book' | 'inaccuracy' | 'mistake' | 'blunder';

export const CLASS_META: Record<MoveClass, { label: string; color: string; icon: string }> = {
  brilliant:  { label: 'é brilhante!',  color: '#26c2a3', icon: '!!' },
  best:       { label: 'é a melhor',    color: '#f0c860', icon: '★' },
  good:       { label: 'é boa',         color: '#a9b2bc', icon: '✓' },
  book:       { label: 'de abertura',   color: '#b8988f', icon: '📖' },
  inaccuracy: { label: 'imprecisão',    color: '#e7a13a', icon: '?!' },
  mistake:    { label: 'é um erro',     color: '#e8821e', icon: '?' },
  blunder:    { label: 'é grave',       color: '#e04545', icon: '??' },
};

/**
 * Avalia a posição a partir do turno actual, em "pawns" para o lado que joga.
 * mate = ±99.
 */
export function evalForSide(g: Chess, depth = 2): number {
  if (g.isCheckmate()) return -99;
  if (g.isGameOver()) return 0;
  return negamax(g, depth, -Infinity, Infinity);
}

/**
 * Classifica uma jogada: compara a avaliação antes/depois e contra a melhor
 * alternativa. `fenBefore` posição antes da jogada; `uci` a jogada (e2e4).
 */
export function classifyMove(fenBefore: string, uci: string, depth = 2): {
  cls: MoveClass; evalBefore: number; evalAfter: number; best: string | null; swing: number;
} {
  const before = new Chess(fenBefore);
  const evBefore = evalForSide(before, depth);

  const alt = new Chess(fenBefore);
  const best = bestMove(alt, depth);

  const after = new Chess(fenBefore);
  let mv = null;
  try {
    mv = after.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  } catch { /* jogada ilegal */ }
  const evAfter = mv ? -evalForSide(after, depth) : evBefore;

  // swing negativo = a jogada piorou a posição do lado que jogou
  const swing = evAfter - evBefore;

  let cls: MoveClass;
  const isBest = best === uci || (best && swing >= -0.05 && uci.startsWith(best.slice(0, 4)));
  if (isBest && mv && (mv.san.includes('#') || (mv.captured && swing > -0.1))) cls = 'brilliant';
  else if (isBest) cls = 'best';
  else if (swing >= -0.4) cls = 'good';
  else if (swing >= -1.2) cls = 'inaccuracy';
  else if (swing >= -2.5) cls = 'mistake';
  else cls = 'blunder';
  return { cls, evalBefore: evBefore, evalAfter: evAfter, best, swing };
}

/** Elo simplificado para desafios com bot (k=32 vs bot rating). */
export function eloDelta(myRating: number, botRating: number, score: 0 | 0.5 | 1): number {
  const expected = 1 / (1 + Math.pow(10, (botRating - myRating) / 400));
  return Math.round(32 * (score - expected));
}
