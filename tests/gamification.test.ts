import { describe, it, expect } from 'vitest';
import { levelFor, xpForLevel, levelProgress, ratingFieldForTimeControl } from '@/lib/gamification';

describe('gamificação — níveis e XP', () => {
  it('nível 1 aos 0 XP', () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(99)).toBe(1);
  });

  it('nível 2 aos 100 XP', () => {
    expect(levelFor(100)).toBe(2);
  });

  it('nível cresce monotonicamente', () => {
    let prev = 1;
    for (const xp of [0, 100, 400, 900, 1600, 8100]) {
      const l = levelFor(xp);
      expect(l).toBeGreaterThanOrEqual(prev);
      prev = l;
    }
    expect(levelFor(8100)).toBe(10);
  });

  it('xpForLevel é consistente com levelFor', () => {
    for (const l of [1, 2, 5, 10]) {
      expect(levelFor(xpForLevel(l))).toBe(l);
    }
  });

  it('levelProgress entre 0 e 100', () => {
    for (const xp of [0, 50, 100, 350, 1600, 5000]) {
      const p = levelProgress(xp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }
  });

  it('rating separado por controlo de tempo', () => {
    expect(ratingFieldForTimeControl(null)).toBe('rating');
    expect(ratingFieldForTimeControl(60)).toBe('rating_blitz');
    expect(ratingFieldForTimeControl(180)).toBe('rating_blitz');
    expect(ratingFieldForTimeControl(300)).toBe('rating_rapid');
    expect(ratingFieldForTimeControl(600)).toBe('rating_rapid');
    expect(ratingFieldForTimeControl(1800)).toBe('rating_classical');
  });
});
