import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  evalBoard, bestMove, botMove, BOT_LEVELS, botForRating,
  classifyMove, eloDelta, evalForSide,
} from '@/lib/engine';

describe('motor de xadrez', () => {
  it('posição inicial tem avaliação ~0', () => {
    expect(Math.abs(evalBoard(new Chess()))).toBeLessThan(0.01);
  });

  it('eval reflecte material', () => {
    // brancas sem dama → avaliação claramente negativa
    const g = new Chess('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1');
    expect(evalBoard(g)).toBeLessThan(-5);
  });

  it('bestMove devolve lance legal', () => {
    const g = new Chess();
    const bm = bestMove(g, 1);
    expect(bm).toBeTruthy();
    const legal = g.moves({ verbose: true }).map((m) => m.lan);
    expect(legal).toContain(bm);
  });

  it('bestMove encontra mate em 1', () => {
    // mate do pastor — dama f3xf7#
    const g = new Chess('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4');
    expect(bestMove(g, 2)).toBe('f3f7');
  });

  it('botMove sempre devolve lance legal em várias posições', () => {
    const g = new Chess();
    for (let i = 0; i < 10; i++) {
      const mv = botMove(g, 1200);
      expect(mv).toBeTruthy();
      expect(() => g.move(mv!)).not.toThrow();
      if (g.isGameOver()) break;
    }
  });

  it('8 níveis de bot ordenados de 500 a 3000', () => {
    expect(BOT_LEVELS).toHaveLength(8);
    expect(BOT_LEVELS[0].rating).toBe(500);
    expect(BOT_LEVELS[7].rating).toBe(3000);
    expect(BOT_LEVELS[7].name).toBe('INP Champion');
    for (let i = 1; i < 8; i++) {
      expect(BOT_LEVELS[i].rating).toBeGreaterThan(BOT_LEVELS[i - 1].rating);
    }
  });

  it('botForRating mapeia ratings', () => {
    expect(botForRating(500).name).toBe('Iniciante');
    expect(botForRating(1500).name).toBe('Intermediário');
    expect(botForRating(9999).name).toBe('INP Champion');
  });

  it('classifyMove: mate é brilhante/melhor', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
    const r = classifyMove(fen, 'f3f7', 1);
    expect(['brilliant', 'best']).toContain(r.cls);
  });

  it('classifyMove: dama enforcada é erro/grave', () => {
    // dama vai para h5 onde o peão g6 a captura
    const fen = '4k3/8/4p1p1/8/8/8/8/3QK3 w - - 0 1';
    const r = classifyMove(fen, 'd1h5', 1);
    expect(['blunder', 'mistake', 'inaccuracy']).toContain(r.cls);
    const good = classifyMove(fen, 'd1d4', 1);
    expect(['best', 'good', 'brilliant']).toContain(good.cls);
  });

  it('evalForSide devolve -99 em mate', () => {
    const g = new Chess('r1bqkbnr/pppp1Qpp/2n5/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4');
    expect(g.isCheckmate()).toBe(true);
    expect(evalForSide(g)).toBe(-99);
  });

  it('eloDelta: ganhar a mais forte sobe, perder desce', () => {
    expect(eloDelta(1200, 2000, 1)).toBeGreaterThan(15);
    expect(eloDelta(2000, 1200, 1)).toBeLessThan(16);
    expect(eloDelta(1200, 2000, 0)).toBeLessThanOrEqual(0); // ~0 arredondado
    expect(eloDelta(1200, 1200, 0.5)).toBe(0);
  });
});
