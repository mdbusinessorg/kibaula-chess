'use client';

// INP CHESS — gamificação: XP, níveis, streaks e conquistas

import { supabase } from './client';
import { isOnline, queueAction } from './offline';

export const XP = {
  gamePlayed: 10,
  win: 30,
  draw: 15,
  puzzleSolved: 15,      // + bónus por rating do puzzle
  puzzleBonusPer100: 2,  // +2 XP por cada 100 de rating acima de 500
  lesson: 20,
  dailyActive: 5,
} as const;

/** Nível: sqrt(xp/100)+1 → nv2 aos 100, nv5 aos 1600, nv10 aos 8100 XP. */
export function levelFor(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}
/** XP total necessário para atingir o nível n. */
export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}
/** % de progresso dentro do nível actual. */
export function levelProgress(xp: number): number {
  const lvl = levelFor(xp);
  const lo = xpForLevel(lvl);
  const hi = xpForLevel(lvl + 1);
  return Math.min(100, Math.round(((xp - lo) / (hi - lo)) * 100));
}

export type AchievementDef = { code: string; title: string; desc: string; icon: string; xp: number };

// Lista local (espelha a tabela `achievements` — funciona offline)
export const ACHIEVEMENTS: AchievementDef[] = [
  { code: 'first_win',    title: 'Primeira Vitória',       desc: 'Vence a tua primeira partida.',   icon: '🏆', xp: 50 },
  { code: 'first_live',   title: 'Confronto Online',       desc: 'Joga uma partida ao vivo.',       icon: '🌐', xp: 25 },
  { code: 'games_10',     title: '10 Partidas',            desc: 'Completa 10 partidas.',           icon: '♞',  xp: 50 },
  { code: 'games_50',     title: '50 Partidas',            desc: 'Completa 50 partidas.',           icon: '♜',  xp: 150 },
  { code: 'first_tourney',title: 'Primeiro Torneio',       desc: 'Participa num torneio.',          icon: '🏟️', xp: 40 },
  { code: 'puzzles_10',   title: '10 Puzzles',             desc: 'Resolve 10 puzzles.',             icon: '🧩', xp: 50 },
  { code: 'puzzles_100',  title: '100 Puzzles',            desc: 'Resolve 100 puzzles.',            icon: '💎', xp: 300 },
  { code: 'streak_7',     title: '7 Dias de Streak',       desc: 'Joga 7 dias seguidos.',           icon: '🔥', xp: 100 },
  { code: 'mate_master',  title: 'Caçador de Mates',       desc: 'Resolve 5 puzzles de mate.',      icon: '⚔️', xp: 60 },
  { code: 'endgame_exp',  title: 'Especialista em Finais', desc: 'Conclui o curso de Finais.',      icon: '👑', xp: 120 },
  { code: 'level_5',      title: 'Nível 5',                desc: 'Alcança o nível 5.',              icon: '⭐', xp: 100 },
  { code: 'scholar',      title: 'Estudioso',              desc: 'Conclui 10 lições da Academy.',   icon: '📚', xp: 80 },
];

/** Atribui XP — actualiza xp e level na tabela players (ou fila offline). */
export async function awardXp(playerId: string, amount: number): Promise<number | null> {
  if (!isOnline()) { queueAction({ type: 'xp', playerId, amount }); return null; }
  const { data } = await supabase.from('players').select('xp').eq('id', playerId).single();
  if (!data) return null;
  const xp = (data.xp as number) + amount;
  await supabase.from('players').update({ xp, level: levelFor(xp) }).eq('id', playerId);
  return xp;
}

/** Actualiza o streak diário (chamado ao abrir a app autenticada). */
export async function touchStreak(playerId: string): Promise<number> {
  if (!isOnline()) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase.from('players')
    .select('streak_days,last_active_on').eq('id', playerId).single();
  if (!data || data.last_active_on === today) return (data?.streak_days as number) ?? 0;
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const streak = data.last_active_on === yesterday ? (data.streak_days as number) + 1 : 1;
  await supabase.from('players')
    .update({ streak_days: streak, last_active_on: today }).eq('id', playerId);
  return streak;
}

/** Regista uma conquista; devolve true se foi desbloqueada agora. */
export async function unlock(playerId: string, code: string): Promise<boolean> {
  const def = ACHIEVEMENTS.find((a) => a.code === code);
  if (!def || !isOnline()) return false;
  const { error } = await supabase.from('player_achievements')
    .insert({ player_id: playerId, code });
  if (error) return false; // já existia
  await awardXp(playerId, def.xp);
  return true;
}

/** Corre todas as verificações de conquistas com o estado actual do jogador. */
export async function checkAchievements(
  playerId: string,
  s: { wins: number; games: number; puzzles: number; streak: number; level: number;
       mateSolved?: number; lessons?: number },
): Promise<string[]> {
  const got: string[] = [];
  const tryUnlock = async (cond: boolean, code: string) => {
    if (cond && await unlock(playerId, code)) got.push(code);
  };
  await tryUnlock(s.wins >= 1, 'first_win');
  await tryUnlock(s.games >= 10, 'games_10');
  await tryUnlock(s.games >= 50, 'games_50');
  await tryUnlock(s.puzzles >= 10, 'puzzles_10');
  await tryUnlock(s.puzzles >= 100, 'puzzles_100');
  await tryUnlock(s.streak >= 7, 'streak_7');
  await tryUnlock((s.mateSolved ?? 0) >= 5, 'mate_master');
  await tryUnlock(s.level >= 5, 'level_5');
  await tryUnlock((s.lessons ?? 0) >= 10, 'scholar');
  return got;
}

/** Rating separado por controlo de tempo. */
export function ratingFieldForTimeControl(seconds: number | null):
  'rating_blitz' | 'rating_rapid' | 'rating_classical' | 'rating' {
  if (seconds == null) return 'rating';
  if (seconds <= 180) return 'rating_blitz';
  if (seconds <= 900) return 'rating_rapid';
  return 'rating_classical';
}
