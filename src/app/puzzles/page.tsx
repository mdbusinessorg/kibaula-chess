'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { PUZZLES, PUZZLE_THEMES, puzzlesByTheme, type Puzzle, type PuzzleTheme } from '@/lib/puzzles';
import { getSession, getMyPlayer } from '@/lib/auth';
import { getGuest, saveGuest, queueAction, isOnline } from '@/lib/offline';
import { awardXp, XP } from '@/lib/gamification';
import { supabase } from '@/lib/client';
import { sounds } from '@/lib/sounds';
import { EmptyState, showToast } from '@/components/ui';
import { usePrefs, boardOpts } from '@/lib/prefs';

function PuzzleBoard({ puzzle, onDone }: { puzzle: Puzzle; onDone: (solved: boolean) => void }) {
  const prefs = usePrefs();
  const [game] = useState(() => new Chess(puzzle.fen));
  const [fen, setFen] = useState(game.fen());
  const [step, setStep] = useState(0);
  const [state, setState] = useState<'play' | 'solved' | 'failed'>('play');
  const [, setShake] = useState(0);

  const orientation = puzzle.fen.split(' ')[1] === 'w' ? 'white' : 'black';

  const tryMove = useCallback((from: string, to: string, promotion?: string): boolean => {
    const want = puzzle.solution[step];
    const uci = from + to + (promotion ?? (want?.length === 5 ? want[4] : ''));
    if (uci !== want) {
      setState('failed');
      sounds.illegal();
      setShake((s) => s + 1);
      setTimeout(() => onDone(false), 900);
      return false;
    }
    game.move({ from, to, promotion: uci[4] });
    setFen(game.fen());
    sounds.move();
    let next = step + 1;
    if (next >= puzzle.solution.length) {
      setState('solved');
      sounds.win();
      setTimeout(() => onDone(true), 700);
      return true;
    }
    // resposta automática do lado adversário (jogadas pares da solução)
    const reply = puzzle.solution[next];
    setStep(next);
    setTimeout(() => {
      game.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply[4] });
      setFen(game.fen());
      next++;
      setStep(next);
      if (next >= puzzle.solution.length) {
        setState('solved');
        sounds.win();
        setTimeout(() => onDone(true), 700);
      }
    }, 380);
    return true;
  }, [game, puzzle, step, onDone]);

  return (
    <div>
      <div className="chessboard-wrap mx-auto max-w-[420px]">
        <Chessboard options={{
          position: fen,
          boardOrientation: orientation,
          onPieceDrop: ({ sourceSquare, targetSquare }) =>
            state === 'play' && targetSquare ? tryMove(sourceSquare, targetSquare) : false,
          allowDragging: state === 'play',
          ...boardOpts(prefs),
        }} />
      </div>
      <p className={`mt-2 text-center text-sm font-semibold ${
        state === 'solved' ? 'text-green-400' : state === 'failed' ? 'text-red-400' : 'muted'}`}>
        {state === 'solved' ? '✓ Resolvido!' : state === 'failed' ? '✗ Não é essa — vê a solução' : 'Encontra a melhor jogada'}
      </p>
      {state === 'failed' && (
        <p className="text-center text-xs muted">
          Solução: {puzzle.solution.join(' → ')}
        </p>
      )}
    </div>
  );
}

function PuzzlesInner() {
  const params = useSearchParams();
  const [theme, setTheme] = useState<PuzzleTheme | 'todos'>(
    (params.get('t') as PuzzleTheme) ?? 'todos');
  const [idx, setIdx] = useState(0);
  const [doneSet, setDoneSet] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);
  const [rating, setRating] = useState(1200);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const list = theme === 'todos' ? PUZZLES : puzzlesByTheme(theme);
  const current = list[idx % Math.max(1, list.length)];

  useEffect(() => {
    const t = setTimeout(async () => {
      const s = await getSession();
      if (!s) {
        const g = getGuest();
        setPlayerId('guest');
        setDoneSet(new Set(g?.puzzleDone ?? []));
        setRating(g?.rating ?? 1200);
        return;
      }
      const p = await getMyPlayer(s.userId);
      setPlayerId(p?.id ?? null);
      if (!p) return;
      setRating(p.ratingPuzzle ?? 1200);
      const { data } = await supabase.from('puzzle_attempts')
        .select('puzzle_slug,solved').eq('player_id', p.id).eq('solved', true);
      setDoneSet(new Set((data ?? []).map((r) => r.puzzle_slug as string)));
    });
    return () => clearTimeout(t);
  }, []);

  const record = useCallback(async (puz: Puzzle, solved: boolean) => {
    const delta = solved
      ? Math.max(2, Math.round((puz.rating - rating) / 20) + 8)
      : -Math.max(2, Math.round((rating - puz.rating) / 25) + 4);
    const next = Math.max(100, rating + delta);
    setRating(next);
    if (solved) {
      setDoneSet((d) => new Set(d).add(puz.slug));
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
    if (playerId === 'guest') {
      const g = getGuest();
      if (g) {
        if (solved) { g.puzzlesSolved++; g.puzzleDone.push(puz.slug); g.xp += XP.puzzleSolved; }
        g.rating = next;
        saveGuest(g);
      }
      return;
    }
    if (!playerId) return;
    if (!isOnline()) {
      queueAction({ type: 'puzzle_attempt', playerId, puzzleSlug: puz.slug, solved });
      return;
    }
    await supabase.from('puzzle_attempts').upsert({
      player_id: playerId, puzzle_slug: puz.slug, solved, played_at: new Date().toISOString(),
    }, { onConflict: 'player_id,puzzle_slug' });
    await supabase.from('players').update({ rating_puzzle: next }).eq('id', playerId);
    if (solved) {
      const xp = XP.puzzleSolved + Math.max(0, Math.round((puz.rating - 500) / 100)) * XP.puzzleBonusPer100;
      await awardXp(playerId, xp);
      showToast(`+${xp} XP`);
    }
  }, [playerId, rating]);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🧩 Puzzles</h1>
          <p className="text-sm muted">Rating de puzzles: <strong className="accent">{rating}</strong>
            {streak > 1 && <span className="gold"> · 🔥 {streak} seguidos</span>}
          </p>
        </div>
        <span className="chip">{doneSet.size} resolvidos</span>
      </div>

      {/* categorias */}
      <div className="flex flex-wrap gap-2">
        {PUZZLE_THEMES.map((t) => (
          <button key={t.key} onClick={() => { setTheme(t.key); setIdx(0); }}
            className={`chip ${theme === t.key ? '!border-[var(--accent)] accent' : ''}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {current ? (
        <div className="panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <strong>{current.title}</strong>
              <span className="muted ml-2 text-xs">rating {current.rating} · {current.theme}</span>
            </div>
            {doneSet.has(current.slug) && <span className="chip gold text-[10px]">✓</span>}
          </div>
          <PuzzleBoard key={current.slug} puzzle={current}
            onDone={(solved) => { void record(current, solved); }} />
          <div className="mt-3 flex justify-between">
            <button className="btn-ghost text-xs" disabled={idx === 0}
              onClick={() => setIdx((i) => Math.max(0, i - 1))}>← Anterior</button>
            <button className="btn text-xs"
              onClick={() => setIdx((i) => i + 1)}>Próximo →</button>
          </div>
        </div>
      ) : (
        <EmptyState icon="🧩" title="Sem puzzles nesta categoria" hint="Escolhe outro tema." />
      )}
    </div>
  );
}

export default function PuzzlesPage() {
  return (
    <Suspense fallback={<p className="muted py-10 text-center">A carregar…</p>}>
      <PuzzlesInner />
    </Suspense>
  );
}
