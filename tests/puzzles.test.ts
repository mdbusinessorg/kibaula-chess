import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { PUZZLES, PUZZLE_THEMES, puzzlesByTheme } from '@/lib/puzzles';

describe('banco de puzzles', () => {
  it('todos os puzzles têm soluções legais e correctas', () => {
    expect(PUZZLES.length).toBeGreaterThanOrEqual(20);
    for (const p of PUZZLES) {
      const g = new Chess(p.fen);
      let last;
      for (const uci of p.solution) {
        last = uci.length === 5
          ? g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
          : g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
        expect(last, `${p.slug}: jogada ${uci} ilegal`).toBeTruthy();
      }
      // puzzles de mate terminam em xeque-mate
      if (p.theme.startsWith('mate') || p.theme === 'sacrificio') {
        expect(g.isCheckmate(), `${p.slug} devia ser mate`).toBe(true);
      } else {
        // táctica/finais/defesa: a última jogada captura, dá xeque ou promove
        expect(
          last!.captured || last!.san.includes('+') || last!.san.includes('#') || last!.promotion,
          `${p.slug} termina sem ganho`,
        ).toBeTruthy();
      }
    }
  });

  it('mateN tem exactamente N jogadas do jogador', () => {
    for (const p of PUZZLES) {
      const expected = { mate1: 1, mate2: 2, mate3: 3 }[p.theme as string];
      if (expected) {
        expect(p.solution.length, p.slug).toBe(expected * 2 - 1);
      }
    }
  });

  it('slugs únicos e temas válidos', () => {
    const slugs = new Set(PUZZLES.map((p) => p.slug));
    expect(slugs.size).toBe(PUZZLES.length);
    const valid = new Set(PUZZLE_THEMES.map((t) => t.key));
    for (const p of PUZZLES) expect(valid.has(p.theme)).toBe(true);
  });

  it('puzzlesByTheme filtra', () => {
    for (const t of PUZZLE_THEMES) {
      if (t.key === 'todos') continue;
      for (const p of puzzlesByTheme(t.key)) expect(p.theme).toBe(t.key);
    }
  });
});
