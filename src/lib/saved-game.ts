'use client';

// Partida local/bot em curso — permite retomar depois de fechar a app.
export type SavedGame = {
  kind: 'bot' | 'local';
  fen: string;
  color: 'w' | 'b';
  botRating: number;
  plies: number;
  sans?: string[];
};

const KEY = 'inpchess:game';

export function saveGame(s: SavedGame | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch { /* storage indisponível */ }
}

export function loadGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedGame) : null;
  } catch { return null; }
}
