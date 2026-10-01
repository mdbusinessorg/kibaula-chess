'use client';

// INP CHESS — análise de partidas com a engine local
// Reproduz as jogadas e classifica cada uma (coach bubbles).

import { Chess } from 'chess.js';
import { classifyMove, type MoveClass } from './engine';

export type AnalyzedMove = {
  ply: number;          // 1..n
  san: string;
  uci: string;
  byWhite: boolean;
  cls: MoveClass;
  swing: number;        // perda em "pawns" para quem jogou (negativo = piorou)
  evalAfter: number;    // avaliação para o lado que jogou
  best: string | null;  // melhor jogada (lan)
  fenBefore: string;
};

export type GameAnalysis = {
  moves: AnalyzedMove[];
  accuracyWhite: number;
  accuracyBlack: number;
  counts: Record<MoveClass, number>;
  critical: AnalyzedMove[];   // maiores erros
};

/** Analisa uma sequência de jogadas UCI a partir da posição inicial. */
export function analyzeGame(ucis: string[], depth = 2): GameAnalysis {
  const g = new Chess();
  const moves: AnalyzedMove[] = [];
  const counts: Record<MoveClass, number> = {
    brilliant: 0, best: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0,
  };
  let lossW = 0, cntW = 0, lossB = 0, cntB = 0;

  for (let i = 0; i < ucis.length; i++) {
    const uci = ucis[i];
    const fenBefore = g.fen();
    const byWhite = g.turn() === 'w';
    const { cls, swing, evalAfter, best } = classifyMove(fenBefore, uci, depth);
    let finalCls = cls;
    if (cls === 'best' && i < 12) finalCls = 'book'; // primeiras jogadas certas = livro
    const mv = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    if (!mv) break;
    const loss = Math.max(0, -swing);
    if (byWhite) { lossW += loss; cntW++; } else { lossB += loss; cntB++; }
    counts[finalCls]++;
    moves.push({
      ply: i + 1, san: mv.san, uci, byWhite, cls: finalCls,
      swing, evalAfter, best, fenBefore,
    });
  }

  const acc = (loss: number, n: number) =>
    n === 0 ? 100 : Math.max(0, Math.round(100 - (loss / n) * 25));

  return {
    moves,
    accuracyWhite: acc(lossW, cntW),
    accuracyBlack: acc(lossB, cntB),
    counts,
    critical: moves.filter((m) => m.cls === 'blunder' || m.cls === 'mistake')
      .sort((a, b) => a.swing - b.swing).slice(0, 5),
  };
}

/** Texto do coach para uma jogada classificada (estilo das referências). */
export function coachText(m: AnalyzedMove, opponent?: string): string {
  switch (m.cls) {
    case 'brilliant': return `${m.san} — jogada brilhante!`;
    case 'best': return `${m.san} é a melhor jogada.`;
    case 'good': return `${m.san} é uma boa jogada.`;
    case 'book': return `${m.san} — lance de abertura.`;
    case 'inaccuracy': return `${m.san} é impreciso — ${opponent ?? 'o adversário'} ganha iniciativa.`;
    case 'mistake': return `${m.san} é um erro${m.best ? ` — melhor era ${m.best}` : ''}.`;
    case 'blunder': return `${m.san} é grave!${m.best ? ` A melhor era ${m.best}.` : ''}`;
  }
}
