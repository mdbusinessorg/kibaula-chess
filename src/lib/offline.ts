'use client';

// INP CHESS — camada offline-first
// Estado de ligação, cache local, fila de sincronização e modo visitante.

import { useEffect, useState } from 'react';
import type { Player } from './types';

const Q_KEY = 'inpchess:queue';
const GUEST_KEY = 'inpchess:guest';
const CACHE_PFX = 'inpchess:cache:';

// ---------- estado de ligação ----------
export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => isOnline());
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return online;
}

// ---------- cache local (últimos dados conhecidos) ----------
export function cacheSet<T>(key: string, value: T) {
  try { localStorage.setItem(CACHE_PFX + key, JSON.stringify({ v: value, at: Date.now() })); } catch {}
}
export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PFX + key);
    return raw ? (JSON.parse(raw).v as T) : null;
  } catch { return null; }
}

/** fetch online com fallback para cache; guarda no cache quando online. */
export async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T | null> {
  try {
    const v = await fetcher();
    cacheSet(key, v);
    return v;
  } catch {
    return cacheGet<T>(key);
  }
}

// ---------- fila de sincronização ----------
export type QueuedAction =
  | { type: 'bot_result'; playerId: string; result: 'win' | 'loss' | 'draw'; botRating: number }
  | { type: 'puzzle_attempt'; playerId: string; puzzleSlug: string; solved: boolean }
  | { type: 'lesson_complete'; playerId: string; lessonSlug: string }
  | { type: 'xp'; playerId: string; amount: number };

type Item = { id: string; at: number } & QueuedAction;

export function queueAction(a: QueuedAction) {
  try {
    const q = queueList();
    q.push({ ...a, id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, at: Date.now() });
    localStorage.setItem(Q_KEY, JSON.stringify(q));
    window.dispatchEvent(new Event('inpchess:queue'));
  } catch {}
}

export function queueList(): Item[] {
  try { return JSON.parse(localStorage.getItem(Q_KEY) ?? '[]'); } catch { return []; }
}

export function queueClear(ids: string[]) {
  try {
    const rest = queueList().filter((i) => !ids.includes(i.id));
    localStorage.setItem(Q_KEY, JSON.stringify(rest));
    window.dispatchEvent(new Event('inpchess:queue'));
  } catch {}
}

/** Nº de acções pendentes — reactivo a eventos da fila. */
export function useQueueCount(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const read = () => setN(queueList().length);
    read();
    window.addEventListener('inpchess:queue', read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener('inpchess:queue', read);
      window.removeEventListener('storage', read);
    };
  }, []);
  return n;
}

// ---------- modo visitante (offline sem conta) ----------
export type GuestProfile = {
  username: string;
  rating: number;
  wins: number; losses: number; draws: number;
  xp: number; puzzlesSolved: number;
  lessons: string[];          // lesson_slug concluídos
  puzzleDone: string[];       // puzzle_slug resolvidos
  createdAt: number;
};

export function getGuest(): GuestProfile | null {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function createGuest(): GuestProfile {
  const g: GuestProfile = {
    username: `visitante_${Math.random().toString(36).slice(2, 7)}`,
    rating: 1200, wins: 0, losses: 0, draws: 0, xp: 0,
    puzzlesSolved: 0, lessons: [], puzzleDone: [], createdAt: Date.now(),
  };
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(g)); } catch {}
  return g;
}

export function saveGuest(g: GuestProfile) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(g)); } catch {}
}

/** Converte o perfil visitante num objecto Player para os componentes. */
export function guestAsPlayer(g: GuestProfile): Player {
  return {
    id: 'guest', fullName: 'Visitante', username: g.username, rating: g.rating,
    wins: g.wins, losses: g.losses, draws: g.draws, puzzlesSolved: g.puzzlesSolved,
    xp: g.xp,
    ratingBlitz: g.rating, ratingRapid: g.rating, ratingClassical: g.rating,
    ratingPuzzle: g.rating,
    status: 'Visitante', inpVerified: false,
    courseId: null, courseName: 'Modo offline', courseAbbr: 'OFF',
    classId: null, className: null, gradeLabel: null, academicYear: null,
  };
}
