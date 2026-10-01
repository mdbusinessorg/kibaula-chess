import { describe, it, expect, beforeEach } from 'vitest';

// stub mínimo de localStorage+window para testar a fila em node
const store = new Map<string, string>();
// @ts-expect-error stub
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
// @ts-expect-error stub
globalThis.window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
// @ts-expect-error stub
globalThis.navigator = { onLine: false };

const { queueAction, queueList, queueClear, getGuest, createGuest, saveGuest, isOnline } =
  await import('@/lib/offline');

describe('offline — fila de sincronização', () => {
  beforeEach(() => store.clear());

  it('fila começa vazia', () => {
    expect(queueList()).toHaveLength(0);
  });

  it('queueAction adiciona e persiste', () => {
    queueAction({ type: 'xp', playerId: 'p1', amount: 30 });
    queueAction({ type: 'puzzle_attempt', playerId: 'p1', puzzleSlug: 'm1-x', solved: true });
    const q = queueList();
    expect(q).toHaveLength(2);
    expect(q[0].type).toBe('xp');
    expect((q[1] as { puzzleSlug: string }).puzzleSlug).toBe('m1-x');
  });

  it('queueClear remove só os ids dados', () => {
    queueAction({ type: 'xp', playerId: 'p1', amount: 10 });
    queueAction({ type: 'xp', playerId: 'p1', amount: 20 });
    const q = queueList();
    queueClear([q[0].id]);
    expect(queueList()).toHaveLength(1);
    expect((queueList()[0] as { amount: number }).amount).toBe(20);
  });

  it('modo visitante: cria, guarda, lê', () => {
    expect(getGuest()).toBeNull();
    const g = createGuest();
    expect(g.username.startsWith('visitante_')).toBe(true);
    expect(getGuest()?.username).toBe(g.username);
    g.xp = 150;
    saveGuest(g);
    expect(getGuest()?.xp).toBe(150);
  });

  it('isOnline reflecte navigator.onLine', () => {
    expect(isOnline()).toBe(false);
  });
});
