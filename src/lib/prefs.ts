'use client';

import { useEffect, useState } from 'react';

export type BoardThemeId = 'inp' | 'madeira' | 'noite';

export type Prefs = {
  sound: boolean;
  animations: boolean;
  board: BoardThemeId;
};

const KEY = 'inpchess:prefs';
const EVT = 'inpchess:prefs';

const DEF: Prefs = { sound: true, animations: true, board: 'inp' };

export function getPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEF, ...JSON.parse(raw) } : DEF;
  } catch { return DEF; }
}

export function setPref<K extends keyof Prefs>(k: K, v: Prefs[K]) {
  const next = { ...getPrefs(), [k]: v };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  window.dispatchEvent(new Event(EVT));
}

export function usePrefs(): Prefs {
  const [p, setP] = useState<Prefs>(DEF);
  useEffect(() => {
    const t = setTimeout(() => setP(getPrefs()), 0);
    const on = () => setP(getPrefs());
    window.addEventListener(EVT, on);
    return () => { clearTimeout(t); window.removeEventListener(EVT, on); };
  }, []);
  return p;
}

export const BOARD_THEMES: Record<BoardThemeId, { label: string; light: string; dark: string }> = {
  inp:      { label: 'INP',     light: '#f0e7d3', dark: '#7d2a35' },
  madeira:  { label: 'Madeira', light: '#ecd9b0', dark: '#a5713c' },
  noite:    { label: 'Noite',   light: '#8e97a6', dark: '#3a4150' },
};

/** Opções do react-chessboard conforme as preferências (tema + animações). */
export function boardOpts(p: Prefs) {
  const t = BOARD_THEMES[p.board] ?? BOARD_THEMES.inp;
  return {
    lightSquareStyle: { backgroundColor: t.light },
    darkSquareStyle: { backgroundColor: t.dark },
    boardStyle: { borderRadius: '0.5rem', overflow: 'hidden' as const },
    animationDurationInMs: p.animations ? 220 : 0,
    showAnimations: p.animations,
  };
}
