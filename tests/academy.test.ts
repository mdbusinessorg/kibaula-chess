import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { ACADEMY, courseLessons, courseProgress, getCourse } from '@/lib/academy';

describe('Academy — 8 cursos', () => {
  it('exactamente 8 cursos', () => {
    expect(ACADEMY).toHaveLength(8);
  });

  it('cada curso tem módulos e lições com XP', () => {
    for (const c of ACADEMY) {
      expect(c.modules.length).toBeGreaterThanOrEqual(2);
      const lessons = courseLessons(c);
      expect(lessons.length).toBeGreaterThanOrEqual(4);
      for (const l of lessons) {
        expect(l.slug).toBeTruthy();
        expect(l.title).toBeTruthy();
        expect(l.content.length).toBeGreaterThan(10);
        expect(l.xp).toBeGreaterThan(0);
      }
    }
  });

  it('exercícios têm soluções legais', () => {
    for (const c of ACADEMY) {
      for (const l of courseLessons(c)) {
        if (l.kind !== 'exercise') continue;
        expect(l.fen, l.slug).toBeTruthy();
        expect(l.solution?.length, l.slug).toBeGreaterThan(0);
        const g = new Chess(l.fen!);
        for (const uci of l.solution!) {
          const mv = uci.length === 5
            ? g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
            : g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
          expect(mv, `${l.slug}: ${uci}`).toBeTruthy();
        }
      }
    }
  });

  it('slugs de lição únicos', () => {
    const all = ACADEMY.flatMap((c) => courseLessons(c).map((l) => l.slug));
    expect(new Set(all).size).toBe(all.length);
  });

  it('courseProgress', () => {
    const c = ACADEMY[0];
    expect(courseProgress(c, new Set())).toBe(0);
    expect(courseProgress(c, new Set(courseLessons(c).map((l) => l.slug)))).toBe(100);
  });

  it('getCourse por slug', () => {
    expect(getCourse('tatica')?.title).toBe('Tática');
    expect(getCourse('inexistente')).toBeUndefined();
  });
});
