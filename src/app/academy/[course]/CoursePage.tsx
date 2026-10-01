'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { courseLessons, courseProgress, type AcademyCourse, type Lesson } from '@/lib/academy';
import { getSession, getMyPlayer } from '@/lib/auth';
import { getGuest, saveGuest, queueAction, isOnline } from '@/lib/offline';
import { awardXp } from '@/lib/gamification';
import { supabase } from '@/lib/client';
import { ProgressBar, showToast } from '@/components/ui';
import { sounds } from '@/lib/sounds';
import { usePrefs, boardOpts } from '@/lib/prefs';

function ExerciseBoard({ lesson, onSolved }: { lesson: Lesson; onSolved: () => void }) {
  const prefs = usePrefs();
  const [game] = useState(() => new Chess(lesson.fen));
  const [fen, setFen] = useState(game.fen());
  const [step, setStep] = useState(0);
  const [wrong, setWrong] = useState(false);

  function tryMove(from: string, to: string, promotion?: string): boolean {
    const want = lesson.solution?.[step];
    // promoção implícita: a solução 'a7a8q' é aceite quando o drop dá 'a7a8'
    const promo = promotion ?? (want && want.length === 5 && from + to === want.slice(0, 4) ? want[4] : '');
    const uci = from + to + promo;
    if (want && uci === want) {
      game.move({ from, to, promotion: promo || 'q' });
      setFen(game.fen());
      sounds.move();
      const next = step + 1;
      setStep(next);
      if (next >= (lesson.solution?.length ?? 0)) {
        sounds.win();
        onSolved();
      } else {
        // resposta automática do "adversário" (próxima jogada da solução)
        const reply = lesson.solution![next];
        setTimeout(() => {
          game.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply[4] });
          setFen(game.fen());
          setStep(next + 1);
          if (next + 1 >= (lesson.solution?.length ?? 0)) { sounds.win(); onSolved(); }
        }, 400);
      }
      return true;
    }
    setWrong(true);
    sounds.illegal();
    setTimeout(() => setWrong(false), 600);
    return false;
  }

  return (
    <div className={`mx-auto max-w-[380px] ${wrong ? 'animate-pulse' : ''}`}>
      <div className="chessboard-wrap">
        <Chessboard options={{
          position: fen,
          onPieceDrop: ({ sourceSquare, targetSquare }) =>
            targetSquare ? tryMove(sourceSquare, targetSquare) : false,
          onSquareClick: () => {},
          allowDragging: true,
          ...boardOpts(prefs),
        }} />
      </div>
    </div>
  );
}

export default function CoursePage({ course }: { course: AcademyCourse }) {
  const [open, setOpen] = useState<Lesson | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      const s = await getSession();
      if (!s) {
        const g = getGuest();
        setDone(new Set(g?.lessons ?? []));
        setPlayerId('guest');
        return;
      }
      const p = await getMyPlayer(s.userId);
      setPlayerId(p?.id ?? null);
      if (p) {
        const { data } = await supabase.from('lesson_progress')
          .select('lesson_slug').eq('player_id', p.id);
        setDone(new Set((data ?? []).map((r) => r.lesson_slug as string)));
      }
    });
    return () => clearTimeout(t);
  }, []);

  const complete = useCallback(async (lesson: Lesson) => {
    if (done.has(lesson.slug)) return;
    setDone((d) => new Set(d).add(lesson.slug));
    showToast(`+${lesson.xp} XP — lição concluída`);
    if (playerId === 'guest') {
      const g = getGuest();
      if (g) { g.lessons.push(lesson.slug); g.xp += lesson.xp; saveGuest(g); }
      return;
    }
    if (!playerId) return;
    if (!isOnline()) {
      queueAction({ type: 'lesson_complete', playerId, lessonSlug: lesson.slug });
      queueAction({ type: 'xp', playerId, amount: lesson.xp });
      return;
    }
    await supabase.from('lesson_progress').upsert({
      player_id: playerId, lesson_slug: lesson.slug, completed_at: new Date().toISOString(),
    }, { onConflict: 'player_id,lesson_slug' });
    await awardXp(playerId, lesson.xp);
  }, [done, playerId]);

  const pct = courseProgress(course, done);
  const total = courseLessons(course).length;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/academy" className="text-sm muted">← Academy</Link>
      <div className="panel p-5">
        <div className="flex items-start gap-3">
          <span className="tile-icon text-2xl">{course.icon}</span>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{course.title}</h1>
            <p className="text-sm muted">{course.description}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1"><ProgressBar pct={pct} /></div>
          <span className="text-xs muted">{pct}%</span>
        </div>
      </div>

      {course.modules.map((mod, mi) => (
        <div key={mi} className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide muted">
            Módulo {mi + 1} · {mod.title}
          </h2>
          <div className="space-y-2">
            {mod.lessons.map((l) => {
              const isDone = done.has(l.slug);
              return (
                <button key={l.slug} onClick={() => setOpen(open?.slug === l.slug ? null : l)}
                  className="panel flex w-full items-center gap-3 p-3 text-left hover:border-[var(--accent)]">
                  <span className={`tile-icon !h-8 !w-8 text-sm ${isDone ? '!bg-[var(--accent)]/20' : ''}`}>
                    {isDone ? '✓' : l.kind === 'exercise' ? '⚔️' : '📖'}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{l.title}</span>
                    <span className="text-xs muted">{l.kind === 'exercise' ? 'Exercício' : 'Lição'} · +{l.xp} XP</span>
                  </span>
                  <span className="muted">{open?.slug === l.slug ? '▾' : '▸'}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {open && (
        <div className="panel space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">{open.title}</h3>
            <button className="muted" onClick={() => setOpen(null)}>✕</button>
          </div>
          <p className="text-sm leading-relaxed">{open.content}</p>
          {open.kind === 'exercise' && open.fen && open.solution && (
            <ExerciseBoard key={open.slug} lesson={open} onSolved={() => void complete(open)} />
          )}
          {open.kind === 'lesson' && (
            <button className="btn w-full text-sm" disabled={done.has(open.slug)}
              onClick={() => void complete(open)}>
              {done.has(open.slug) ? '✓ Concluída' : `Concluir lição (+${open.xp} XP)`}
            </button>
          )}
        </div>
      )}

      <p className="text-center text-xs muted">
        {total} lições · {course.title} · INP CHESS Academy
      </p>
    </div>
  );
}
