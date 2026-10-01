'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/client';
import { queueList, queueClear, useOnline } from '@/lib/offline';

/** Drena a fila de sincronização quando a ligação volta. */
async function flush() {
  const items = queueList();
  if (!items.length) return;
  const done: string[] = [];
  for (const it of items) {
    try {
      if (it.type === 'xp') {
        const { data } = await supabase.from('players').select('xp')
          .eq('id', it.playerId).single();
        if (data) {
          const xp = (data.xp as number) + it.amount;
          const level = Math.floor(Math.sqrt(xp / 100)) + 1;
          await supabase.from('players').update({ xp, level }).eq('id', it.playerId);
          done.push(it.id);
        }
      } else if (it.type === 'puzzle_attempt') {
        await supabase.from('puzzle_attempts').upsert({
          player_id: it.playerId, puzzle_slug: it.puzzleSlug,
          solved: it.solved, played_at: new Date(it.at).toISOString(),
        }, { onConflict: 'player_id,puzzle_slug' });
        done.push(it.id);
      } else if (it.type === 'lesson_complete') {
        await supabase.from('lesson_progress').upsert({
          player_id: it.playerId, lesson_slug: it.lessonSlug,
          completed_at: new Date(it.at).toISOString(),
        }, { onConflict: 'player_id,lesson_slug' });
        done.push(it.id);
      } else if (it.type === 'bot_result') {
        const f = it.result === 'win' ? 'wins' : it.result === 'loss' ? 'losses' : 'draws';
        const { data } = await supabase.from('players').select(f).eq('id', it.playerId).single();
        if (data) {
          const cur = (data as Record<string, number>)[f] ?? 0;
          await supabase.from('players')
            .update({ [f]: cur + 1 }).eq('id', it.playerId);
          done.push(it.id);
        }
      }
    } catch {
      /* mantém na fila para a próxima tentativa */
    }
  }
  if (done.length) queueClear(done);
}

export default function SyncManager() {
  const online = useOnline();

  // ao voltar online + quando novos itens entram na fila
  useEffect(() => {
    if (!online) return;
    void flush();
    const onQueue = () => { if (navigator.onLine) void flush(); };
    window.addEventListener('inpchess:queue', onQueue);
    return () => window.removeEventListener('inpchess:queue', onQueue);
  }, [online]);

  // retry periódico enquanto houver pendências
  useEffect(() => {
    const iv = setInterval(() => {
      if (navigator.onLine && queueList().length) void flush();
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  return null;
}
