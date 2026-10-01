'use client';

import { Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import { Chess, type Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getSession, getMyPlayer } from '@/lib/auth';
import type { Player } from '@/lib/types';
import {
  listLobby, createMatch, joinMatch, postMove, finishMatch, abortMatch,
  offerDraw, respondDraw, listChat, postChat, subscribeChat,
  subscribeMatch, subscribeLobby, getMatch, type LiveMatch, type ChatMsg,
} from '@/lib/live';
import { supabase } from '@/lib/client';
import { sounds } from '@/lib/sounds';
import { botMove, botForRating, classifyMove, BOT_LEVELS } from '@/lib/engine';
import { coachText, type AnalyzedMove } from '@/lib/analysis';
import { awardXp, XP, checkAchievements } from '@/lib/gamification';
import { getGuest, saveGuest, isOnline } from '@/lib/offline';
import { Sheet, CoachBubble, showToast } from '@/components/ui';
import { usePrefs, boardOpts } from '@/lib/prefs';
import { saveGame, loadGame, type SavedGame } from '@/lib/saved-game';

function gameStatus(g: Chess): string {
  if (g.isCheckmate()) return `Xeque-mate — vencem as ${g.turn() === 'w' ? 'pretas' : 'brancas'}`;
  if (g.isStalemate()) return 'Empate por afogamento';
  if (g.isThreefoldRepetition()) return 'Empate por repetição';
  if (g.isInsufficientMaterial()) return 'Empate por material insuficiente';
  if (g.isDraw()) return 'Empate';
  return `${g.turn() === 'w' ? 'Brancas' : 'Pretas'} a jogar${g.inCheck() ? ' — xeque!' : ''}`;
}

function fmtClock(s: number): string {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

const DOT_BG = 'radial-gradient(circle, rgba(0,0,0,.4) 20%, transparent 23%)';
const CAPTURE_RING = 'radial-gradient(circle, transparent 58%, rgba(239,68,68,.85) 62%, rgba(239,68,68,.85) 66%, transparent 70%)';
const CHECK_GLOW = 'radial-gradient(circle, rgba(239,68,68,.75) 30%, rgba(239,68,68,.25) 60%, transparent 75%)';

function kingSquare(g: Chess, color: 'w' | 'b'): string | null {
  const b = g.board();
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = b[r][c];
    if (p && p.type === 'k' && p.color === color) return `${'abcdefgh'[c]}${8 - r}`;
  }
  return null;
}

function useHints(game: Chess, canMove: boolean, tryMove: (from: string, to: string) => boolean) {
  const [selected, setSelected] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  const targets = selected ? game.moves({ square: selected as Square, verbose: true }) : [];

  const styles: Record<string, CSSProperties> = {};
  if (selected) {
    styles[selected] = { boxShadow: 'inset 0 0 0 3px var(--accent)', backgroundColor: 'rgba(231,179,74,.28)' };
  }
  for (const m of targets) {
    styles[m.to] = m.captured
      ? { backgroundImage: CAPTURE_RING, backgroundSize: '100% 100%' }
      : { backgroundImage: DOT_BG, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' };
  }
  if (lastMove) {
    for (const s of [lastMove.from, lastMove.to]) {
      styles[s] = { ...(styles[s] ?? {}), backgroundColor: 'rgba(250,204,21,.25)' };
    }
  }
  if (game.inCheck()) {
    const k = kingSquare(game, game.turn());
    if (k) styles[k] = { ...(styles[k] ?? {}), backgroundImage: CHECK_GLOW, backgroundSize: '100% 100%' };
  }

  function onSquareClick({ piece, square }: { piece: unknown; square: string }) {
    if (!canMove) { setSelected(null); return; }
    if (selected && targets.some((m) => m.to === square)) {
      tryMove(selected, square);
      setSelected(null);
      return;
    }
    const p = piece as { pieceType?: string } | null;
    setSelected(p?.pieceType ? square : null);
  }

  const markMove = useCallback((from: string, to: string) => {
    setLastMove({ from, to });
    setSelected(null);
  }, []);

  return { squareStyles: styles, onSquareClick, markMove, clear: () => setSelected(null) };
}

// peças capturadas por um lado (glifos do adversário que saíram do tabuleiro)
const BASE_COUNT: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const GLYPH: Record<string, [string, string]> = {
  p: ['♙', '♟'], n: ['♘', '♞'], b: ['♗', '♝'], r: ['♖', '♜'], q: ['♕', '♛'],
};
function capturedBy(g: Chess, color: 'w' | 'b'): string {
  const opp = color === 'w' ? 'b' : 'w';
  const cnt: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
  for (const row of g.board()) for (const c of row)
    if (c && c.color === opp && c.type !== 'k') cnt[c.type]++;
  let out = '';
  for (const t of ['q', 'r', 'b', 'n', 'p'])
    for (let i = cnt[t]; i < BASE_COUNT[t]; i++) out += GLYPH[t][opp === 'w' ? 0 : 1];
  return out;
}

const TIME_CONTROLS: { label: string; seconds: number | null }[] = [
  { label: 'Sem relógio', seconds: null },
  { label: 'Bullet · 1 min', seconds: 60 },
  { label: 'Blitz · 5 min', seconds: 300 },
  { label: 'Rápida · 10 min', seconds: 600 },
  { label: 'Clássica · 30 min', seconds: 1800 },
];

function PlayerCard({ name, rating, clock, active, icon }: {
  name: string; rating?: number; clock: number | null; active: boolean; icon?: string;
}) {
  return (
    <div className={`panel flex items-center justify-between p-3 ${active ? 'ring-1 ring-[var(--accent)]' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="tile-icon !h-10 !w-10 text-lg">{icon ?? '👤'}</span>
        <div>
          <div className="text-sm font-semibold">{name}</div>
          {rating != null && <div className="text-xs muted">Rating {rating}</div>}
        </div>
      </div>
      {clock != null && (
        <span className={`rounded-lg px-3 py-1 font-mono text-lg font-bold ${active ? 'bg-[var(--accent)] text-white' : 'bg-black/40'}`}>
          {fmtClock(clock)}
        </span>
      )}
    </div>
  );
}

/** Escolha da peça de promoção (sheet estilo iOS). */
function PromotionSheet({ open, onPick, onCancel, color }: {
  open: boolean; onPick: (p: 'q' | 'r' | 'b' | 'n') => void; onCancel: () => void; color: 'w' | 'b';
}) {
  const pieces = color === 'w'
    ? [['q', '♕'], ['r', '♖'], ['b', '♗'], ['n', '♘']] as const
    : [['q', '♛'], ['r', '♜'], ['b', '♝'], ['n', '♞']] as const;
  return (
    <Sheet open={open} onClose={onCancel} title="Promover para">
      <div className="promo-row">
        {pieces.map(([p, icon]) => (
          <button key={p} className="promo-btn" onClick={() => onPick(p)}>{icon}</button>
        ))}
      </div>
    </Sheet>
  );
}

/** É promoção? (peão a chegar à última fila) */
function isPromotion(g: Chess, from: string, to: string): boolean {
  return g.moves({ square: from as Square, verbose: true })
    .some((m) => m.to === to && !!m.promotion);
}

// ---------- jogo contra o bot / local (2 jogadores, 1 telemóvel) ----------
function BotGame({ player, botRating, color, local, resumeFen, onExit }: {
  player: Player; botRating: number; color: 'w' | 'b';
  local?: boolean; resumeFen?: string; onExit: () => void;
}) {
  const prefs = usePrefs();
  const startFen = resumeFen ?? new Chess().fen();
  const [game] = useState(() => new Chess(startFen));
  const [fen, setFen] = useState(game.fen());
  const [status, setStatus] = useState(gameStatus(game));
  const [over, setOver] = useState(game.isGameOver());
  // lances anteriores ao load (retomada) — g.history() só cobre lances novos
  const [baseSans] = useState<string[]>(resumeFen ? (loadGame()?.sans ?? []) : []);
  const [log, setLog] = useState<{ san: string; t: number; fen: string }[]>(() => {
    const init = new Chess();
    return baseSans.map((san) => { init.move(san); return { san, t: 0, fen: init.fen() }; });
  });
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [coach, setCoach] = useState<AnalyzedMove | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const lastMoveAt = useRef(0);
  const markMoveRef = useRef<(f: string, t: string) => void>(() => {});
  const isGuest = player.id === 'guest';
  const bot = botForRating(botRating);

  const afterMove = useCallback((g: Chess, playerMove?: { uci: string; fenBefore: string }) => {
    setFen(g.fen());
    setViewPly(null);
    const now = Date.now();
    const elapsed = lastMoveAt.current ? (now - lastMoveAt.current) / 1000 : 0;
    lastMoveAt.current = now;
    const sans = [...baseSans, ...g.history()];
    setLog((prev) => {
      const tmp = new Chess();
      return sans.map((san, i) => {
        tmp.move(san);
        return { san, t: i < prev.length ? prev[i].t : elapsed, fen: tmp.fen() };
      });
    });
    const last = g.history({ verbose: true }).at(-1);
    if (last) {
      if (last.captured) sounds.capture(); else sounds.move();
      setTimeout(() => { if (g.inCheck() && !g.isGameOver()) sounds.check(); }, 80);
      markMoveRef.current(last.from, last.to);
    }
    setStatus(gameStatus(g));

    if (g.isGameOver()) {
      saveGame(null);
    } else {
      saveGame({ kind: local ? 'local' : 'bot', fen: g.fen(), color, botRating, plies: sans.length, sans });
    }

    // coach bubble: classifica a jogada do jogador (local, offline-ok)
    if (!local && playerMove) {
      const { cls, swing, evalAfter, best } = classifyMove(playerMove.fenBefore, playerMove.uci, 1);
      setCoach({
        ply: g.history().length, san: last?.san ?? '', uci: playerMove.uci,
        byWhite: color === 'w', cls, swing, evalAfter, best, fenBefore: playerMove.fenBefore,
      });
    }

    if (g.isGameOver()) {
      setOver(true);
      const res = g.isCheckmate() ? (g.turn() === 'w' ? '0-1' : '1-0') : '1/2-1/2';
      const mine = (res === '1-0' && color === 'w') || (res === '0-1' && color === 'b');
      if (g.isCheckmate() && mine) sounds.win(); else sounds.end();
      if (local) return;

      if (isGuest) {
        const g2 = getGuest();
        if (g2) {
          if (g.isCheckmate()) { if (mine) g2.wins++; else g2.losses++; } else g2.draws++;
          g2.xp += XP.gamePlayed + (mine ? XP.win : res === '1/2-1/2' ? XP.draw : 0);
          saveGuest(g2);
        }
      } else {
        const amount = XP.gamePlayed + (mine ? XP.win : res === '1/2-1/2' ? XP.draw : 0);
        void awardXp(player.id, amount);
        const f = g.isCheckmate() ? (mine ? 'wins' : 'losses') : 'draws';
        supabase.from('players').select('wins,losses,draws').eq('id', player.id).single()
          .then(({ data }) => {
            if (!data) return;
            const next = { ...data, [f]: (data[f] as number) + 1 };
            supabase.from('players').update({ [f]: next[f] }).eq('id', player.id).then(() => {
              void checkAchievements(player.id, {
                wins: next.wins, games: next.wins + next.losses + next.draws,
                puzzles: 0, streak: 0, level: 1,
              }).then((got) => got.length && showToast(`🏅 Conquista desbloqueada!`));
            });
          });
      }
    }
  }, [color, player.id, isGuest, local, botRating, baseSans]);

  function tryMove(from: string, to: string, promotion?: string): boolean {
    const g = game;
    if (g.isGameOver() || (!local && g.turn() !== color)) return false;
    if (viewPly != null) setViewPly(null);
    if (!promotion && isPromotion(g, from, to)) { setPromo({ from, to }); return true; }
    const fenBefore = g.fen();
    let uci: string;
    try {
      const m = g.move({ from, to, promotion: promotion ?? 'q' });
      if (!m) { sounds.illegal(); return false; }
      uci = m.lan;
    } catch { sounds.illegal(); return false; }
    afterMove(g, { uci, fenBefore });
    if (!local) {
      // o motor corre noutro tick — a UI nunca congela
      setTimeout(() => {
        const mv = botMove(g, botRating);
        if (mv && !g.isGameOver()) { g.move(mv); afterMove(g); }
      }, 300);
    }
    return true;
  }

  const hints = useHints(game, !over && viewPly == null && (local || game.turn() === color), tryMove);
  useEffect(() => { markMoveRef.current = hints.markMove; }, [hints]);

  function onDrop({ sourceSquare, targetSquare }: { piece: unknown; sourceSquare: string; targetSquare: string | null }) {
    if (!targetSquare) return false;
    return tryMove(sourceSquare, targetSquare);
  }

  useEffect(() => {
    sounds.start();
    if (!local && color === 'b' && !resumeFen) {
      const t = setTimeout(() => {
        const mv = botMove(game, botRating);
        if (mv) { game.move(mv); afterMove(game); }
      }, 400);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topSide: 'w' | 'b' = local ? 'b' : color === 'w' ? 'b' : 'w';
  const mySide: 'w' | 'b' = local ? 'w' : color;
  const shownFen = viewPly != null && log[viewPly] ? log[viewPly].fen : fen;

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_280px]">
      <div className="mx-auto w-full max-w-[460px] space-y-3">
        <div>
          <PlayerCard name={local ? 'Pretas' : bot.name} rating={local ? undefined : bot.rating}
            clock={null} active={!over && game.turn() === topSide} icon={local ? '♚' : bot.icon} />
          <div className="min-h-5 pl-1 pt-0.5 text-base leading-none tracking-tight">{capturedBy(game, topSide)}</div>
        </div>
        <div className="chessboard-wrap">
          <Chessboard options={{
            position: shownFen,
            boardOrientation: !local && color === 'b' ? 'black' : 'white',
            onPieceDrop: onDrop,
            onSquareClick: (e) => {
              if (viewPly != null) { setViewPly(null); return; }
              hints.onSquareClick(e);
            },
            squareStyles: viewPly == null ? hints.squareStyles : {},
            allowDragging: !over && viewPly == null,
            ...boardOpts(prefs),
          }} />
        </div>
        <div>
          <PlayerCard name={local ? 'Brancas' : player.username} rating={local ? undefined : player.rating}
            clock={null} active={!over && game.turn() === mySide} icon={local ? '♔' : undefined} />
          <div className="min-h-5 pl-1 pt-0.5 text-base leading-none tracking-tight">{capturedBy(game, mySide)}</div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="panel p-4 text-sm">
          <p className="muted">{status}</p>
          <p className="mt-1 text-xs muted">
            {local
              ? '👥 Partida local — dois jogadores, um telemóvel'
              : `${bot.icon} ${bot.name} (${bot.rating}) · ${bot.desc} · jogas de ${color === 'w' ? 'brancas' : 'pretas'}`}
          </p>
        </div>
        {coach && <CoachBubble cls={coach.cls} text={coachText(coach, bot.name)} />}
        <div className="grid grid-cols-2 gap-2">
          {!local && (
            <button className="btn-ghost text-sm" onClick={() => {
              try { game.undo(); game.undo(); } catch { /* sem jogadas */ }
              setFen(game.fen()); setStatus(gameStatus(game)); setViewPly(null);
              setCoach(null);
              setLog((p) => p.slice(0, -2));
              saveGame(game.history().length
                ? { kind: 'bot', fen: game.fen(), color, botRating, plies: game.history().length }
                : null);
            }}>↩ Refazer</button>
          )}
          <button className="btn-ghost text-sm !border-red-500/50 text-red-400" onClick={() => {
            setStatus(local
              ? (game.turn() === 'w' ? 'Pretas vencem — desistência' : 'Brancas vencem — desistência')
              : (color === 'w' ? 'Pretas vencem — desistência' : 'Brancas vencem — desistência'));
            setOver(true); sounds.end(); saveGame(null);
          }}>🏳 Desistir</button>
        </div>
        <button className="btn-ghost w-full text-sm" onClick={onExit}>← Nova partida</button>
        <div className="panel max-h-64 overflow-y-auto p-4 text-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="muted text-[.65rem] font-bold uppercase tracking-wide">Lances</span>
            {log.length > 0 && (
              <div className="flex gap-1 text-xs">
                <button className="btn-ghost !px-2 !py-0.5" onClick={() => setViewPly(0)}>⏮</button>
                <button className="btn-ghost !px-2 !py-0.5" disabled={viewPly == null || viewPly === 0}
                  onClick={() => setViewPly((v) => (v == null ? log.length - 1 : Math.max(0, v - 1)))}>◀</button>
                <button className="btn-ghost !px-2 !py-0.5" disabled={viewPly == null}
                  onClick={() => setViewPly((v) => (v == null ? null : v + 1 >= log.length ? null : v + 1))}>▶</button>
                <button className="btn-ghost !px-2 !py-0.5" disabled={viewPly == null}
                  onClick={() => setViewPly(null)}>⏭</button>
              </div>
            )}
          </div>
          {viewPly != null && (
            <p className="muted mb-1 text-[.65rem]">A rever o lance {viewPly + 1} — toca no tabuleiro para voltar</p>
          )}
          {log.length ? log.map((m, i) => (
            <button key={i} onClick={() => setViewPly(i)}
              className={`rounded px-1 text-left ${viewPly === i ? 'bg-[var(--accent)]/25' : 'hover:bg-[var(--panel-2)]'}`}>
              <span className="muted">{i % 2 === 0 ? `${i / 2 + 1}. ` : ''}</span>
              <span className="text-[var(--text)]">{m.san}</span>
              <span className="muted ml-1 text-[10px]">{fmtClock(m.t)}</span>{' '}
            </button>
          )) : <span className="muted">Sem jogadas ainda.</span>}
        </div>
        {over && <button className="btn w-full text-sm" onClick={onExit}>Nova partida</button>}
      </div>
      <PromotionSheet open={!!promo} color={local ? game.turn() : color}
        onCancel={() => setPromo(null)}
        onPick={(p) => {
          const t = promo; setPromo(null);
          if (t) tryMove(t.from, t.to, p);
        }} />
    </div>
  );
}

// ---------- partida online ao vivo ----------
type TimedMove = { ply: number; san: string; uci: string; playedAt: number };

function LiveGame({ matchId, me, onExit }: { matchId: string; me: Player; onExit: () => void }) {
  const prefs = usePrefs();
  const [game] = useState(() => new Chess());
  const [fen, setFen] = useState(game.fen());
  const [applied, setApplied] = useState(0);
  const [match, setMatch] = useState<LiveMatch | null>(null);
  const [moves, setMoves] = useState<TimedMove[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatText, setChatText] = useState('');
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const lastPly = useRef(0);
  const startedRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const myColor: 'w' | 'b' | null = !match ? null
    : match.whitePlayerId === me.id ? 'w'
    : match.blackPlayerId === me.id ? 'b' : null;
  const active = match?.status === 'active';
  const myTurn = active && !!myColor && game.turn() === myColor;

  const reloadChat = useCallback(() => {
    listChat(matchId).then(setChat).catch(() => {});
  }, [matchId]);

  const rebuild = useCallback(async () => {
    const { data } = await supabase.from('live_moves')
      .select('ply,uci,san,played_at').eq('match_id', matchId).order('ply');
    const g = new Chess();
    for (const m of data ?? []) {
      g.move({ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), promotion: m.uci[4] ?? 'q' });
    }
    game.load(g.fen());
    setApplied(data?.length ?? 0);
    setFen(g.fen());
    setMoves((data ?? []).map((m) => ({
      ply: m.ply, san: m.san, uci: m.uci, playedAt: new Date(m.played_at).getTime(),
    })));
    const count = data?.length ?? 0;
    if (count > lastPly.current) {
      const last = g.history({ verbose: true }).at(-1);
      if (last) {
        if (last.captured) sounds.capture(); else sounds.move();
        if (g.inCheck() && !g.isGameOver()) setTimeout(() => sounds.check(), 80);
      }
    }
    lastPly.current = count;
  }, [matchId, game]);

  useEffect(() => {
    const t = setTimeout(() => { getMatch(matchId).then(setMatch); rebuild(); reloadChat(); });
    const iv = setInterval(() => setTick((x) => x + 1), 1000);
    const unsub = subscribeMatch(matchId, () => { rebuild(); }, (u) => {
      setMatch((m) => m ? {
        ...m,
        status: u.status as LiveMatch['status'],
        result: u.result as LiveMatch['result'],
        endReason: u.end_reason,
        drawOfferedBy: u.draw_offered_by,
        blackPlayerId: u.black_player_id ?? m.blackPlayerId,
      } : m);
    });
    const unsubChat = subscribeChat(matchId, reloadChat);
    return () => { clearTimeout(t); clearInterval(iv); unsub(); unsubChat(); };
  }, [matchId, rebuild, reloadChat]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ block: 'nearest' }); }, [chat.length]);

  function clockFor(side: 'w' | 'b'): number | null {
    const base = match?.timeControlSeconds;
    if (!match || base == null) return null;
    let spent = 0;
    const start = match.createdAt ? new Date(match.createdAt).getTime() : Date.now();
    const anchor = moves.length ? moves[0].playedAt : start;
    let prev = anchor;
    for (const mv of moves) {
      if ((mv.ply % 2 === 1) === (side === 'w')) spent += (mv.playedAt - prev) / 1000;
      prev = mv.playedAt;
    }
    if (active && game.turn() === side && moves.length) spent += (Date.now() - prev) / 1000;
    return base - spent;
  }

  useEffect(() => {
    if (active && !startedRef.current) { startedRef.current = true; sounds.start(); }
    if (!active || match?.timeControlSeconds == null || !moves.length) return;
    const w = clockFor('w'); const b = clockFor('b');
    if (w != null && w <= 0) finishMatch(matchId, '0-1', 'timeout');
    else if (b != null && b <= 0) finishMatch(matchId, '1-0', 'timeout');
    const mine = clockFor(myColor ?? 'w');
    if (myTurn && mine != null && mine <= 10 && mine > 0) sounds.tick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moves, active, match?.timeControlSeconds, fen]);

  function tryMove(from: string, to: string, promotion?: string): boolean {
    if (!myTurn) return false;
    if (!promotion && isPromotion(game, from, to)) { setPromo({ from, to }); return true; }
    let mv;
    try {
      mv = game.move({ from, to, promotion: promotion ?? 'q' });
      if (!mv) { sounds.illegal(); return false; }
    } catch { sounds.illegal(); return false; }
    const ply = applied + 1;
    setApplied(ply);
    setFen(game.fen());
    setMoves((prev) => [...prev, { ply, san: mv.san, uci: mv.lan, playedAt: Date.now() }]);
    setErr(null);
    postMove(matchId, ply, mv.san, mv.lan, game.fen(), me.id)
      .then(() => {
        if (game.isCheckmate()) { sounds.win(); finishMatch(matchId, myColor === 'w' ? '1-0' : '0-1', 'checkmate'); }
        else if (game.isStalemate()) finishMatch(matchId, '1/2-1/2', 'stalemate');
        else if (game.isInsufficientMaterial()) finishMatch(matchId, '1/2-1/2', 'insufficient_material');
        else if (game.isThreefoldRepetition() || game.isDraw()) finishMatch(matchId, '1/2-1/2', 'draw');
        void awardXp(me.id, XP.gamePlayed);
      })
      .catch((e) => setErr(e.message));
    return true;
  }

  const hints = useHints(game, !!myTurn, tryMove);

  function onDrop({ sourceSquare, targetSquare }: { piece: unknown; sourceSquare: string; targetSquare: string | null }) {
    if (!targetSquare) return false;
    return tryMove(sourceSquare, targetSquare);
  }

  function sendChat(e: React.FormEvent) {
    e.preventDefault();
    const t = chatText.trim();
    if (!t) return;
    setChatText('');
    postChat(matchId, me.id, t).then(reloadChat).catch(() => setChatText(t));
  }

  if (!match) return <p className="muted py-10 text-center">A carregar partida…</p>;

  const oppName = myColor === 'w' ? match.blackName : match.whiteName;
  const oppRating = myColor === 'w' ? match.blackRating : match.whiteRating;
  const oppColor: 'w' | 'b' = myColor === 'b' ? 'w' : 'b';
  const finished = match.status === 'finished';
  const drawFromOpp = active && match.drawOfferedBy && match.drawOfferedBy !== me.id;
  const drawFromMe = active && match.drawOfferedBy === me.id;
  const shareLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/jogar?m=${matchId}`;

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_280px]">
      <div className="mx-auto w-full max-w-[460px] space-y-3">
        <PlayerCard name={oppName ?? 'A aguardar adversário…'} rating={oppRating}
          clock={clockFor(oppColor)} active={!!active && game.turn() === oppColor} />
        <div className="chessboard-wrap">
          <Chessboard options={{
            position: fen,
            boardOrientation: myColor === 'b' ? 'black' : 'white',
            onPieceDrop: onDrop,
            onSquareClick: hints.onSquareClick,
            squareStyles: hints.squareStyles,
            allowDragging: !!myTurn,
            ...boardOpts(prefs),
          }} />
        </div>
        <PlayerCard name={me.username} rating={me.rating}
          clock={clockFor(myColor ?? 'w')} active={!!myTurn} />
        {active && (
          <div className="grid grid-cols-3 gap-2">
            {drawFromOpp ? (
              <>
                <button className="btn text-sm" onClick={() => respondDraw(matchId, true)}>Aceitar ½</button>
                <button className="btn-ghost text-sm" onClick={() => respondDraw(matchId, false)}>Recusar</button>
              </>
            ) : (
              <button className="btn-ghost text-sm" disabled={!!drawFromMe}
                onClick={() => offerDraw(matchId, me.id)}>
                {drawFromMe ? 'Empate oferecido…' : '½ Empate'}
              </button>
            )}
            <button className="btn-ghost text-sm" onClick={() => {
              if (myColor) finishMatch(matchId, myColor === 'w' ? '0-1' : '1-0', 'resign');
            }}>🏳 Desistir</button>
            <a className="btn-ghost text-sm text-center" href={`/analise?m=${matchId}`}>🔍 Análise</a>
          </div>
        )}
      </div>
      <div className="space-y-3">
        <div className="panel p-4 text-sm">
          <div className="mb-1 font-semibold">Ao vivo 🌐 {match.rated ? '· por rating' : '· amigável'}</div>
          <p className="muted">
            {match.status === 'waiting' && 'A aguardar adversário…'}
            {active && (myTurn ? 'A tua vez.' : `Vez de ${oppName ?? 'adversário'}…`)}
            {finished && `Terminado: ${match.result} (${match.endReason})`}
            {match.status === 'aborted' && 'Partida abandonada.'}
          </p>
          <p className="mt-2 text-[11px] text-amber-400/80">
            Jogadas ao vivo são permanentes — não é possível refazer.
          </p>
          {err && <p className="mt-1 text-xs text-red-400">{err}</p>}
        </div>
        {match.status === 'waiting' && match.whitePlayerId === me.id && (
          <div className="panel space-y-2 p-4 text-xs">
            <p className="font-semibold">Convida um amigo — envia este link:</p>
            <code className="block break-all rounded bg-black/40 p-2">{shareLink}</code>
            <button className="btn w-full text-xs" onClick={() => {
              navigator.clipboard?.writeText(shareLink).catch(() => {});
            }}>Copiar link</button>
            <button className="btn-ghost w-full text-xs" onClick={() => { abortMatch(matchId); onExit(); }}>
              Cancelar desafio
            </button>
          </div>
        )}
        <div className="panel max-h-48 overflow-y-auto p-4 text-xs">
          {moves.length ? moves.map((m, i) => {
            const prev = i === 0 ? moves[0].playedAt : moves[i - 1].playedAt;
            const dt = i === 0 ? 0 : (m.playedAt - prev) / 1000;
            return (
              <span key={m.ply} className="muted">
                {i % 2 === 0 ? `${Math.floor(m.ply / 2 + 0.5)}. ` : ''}
                <span className="text-[var(--text)]">{m.san}</span>
                <span className="ml-1 text-[10px]">{dt ? `+${fmtClock(dt)}` : ''}</span>{' '}
              </span>
            );
          }) : <span className="muted">Sem jogadas ainda.</span>}
        </div>

        {/* chat da partida */}
        <div className="panel p-3 text-xs">
          <div className="mb-1 font-semibold text-sm">💬 Chat</div>
          <div className="mb-2 max-h-32 space-y-1 overflow-y-auto">
            {chat.length ? chat.map((c) => (
              <p key={c.id} className={c.playerId === me.id ? 'text-[var(--accent)]' : ''}>
                <span className="muted">{c.author.split(' ')[0]}:</span> {c.body}
              </p>
            )) : <p className="muted">Diz olá ao teu adversário 👋</p>}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendChat} className="flex gap-2">
            <input className="input flex-1 !py-1 text-xs" placeholder="Mensagem…"
              value={chatText} onChange={(e) => setChatText(e.target.value)} maxLength={300} />
            <button className="btn !px-3 !py-1 text-xs">➤</button>
          </form>
        </div>

        {!active && match.status !== 'waiting' && (
          <button className="btn w-full text-sm" onClick={onExit}>← Voltar</button>
        )}
      </div>
      <PromotionSheet open={!!promo} color={myColor ?? 'w'}
        onCancel={() => setPromo(null)}
        onPick={(p) => {
          const t = promo; setPromo(null);
          if (t) tryMove(t.from, t.to, p);
        }} />
    </div>
  );
}

// ---------- ecrã Nova Partida ----------
function NewGame({ me, saved, onBot, onLocal, onLive, onResume, onDiscard }: {
  me: Player;
  saved: SavedGame | null;
  onBot: (rating: number, color: 'w' | 'b') => void;
  onLocal: () => void;
  onLive: (id: string) => void;
  onResume: (s: SavedGame) => void;
  onDiscard: () => void;
}) {
  const [mode, setMode] = useState<'online' | 'bot' | 'local'>('bot');
  const [botRating, setBotRating] = useState(1200);
  const [color, setColor] = useState<'w' | 'b'>('w');
  const [tc, setTc] = useState<number | null>(600);
  const [rated, setRated] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [lobby, setLobby] = useState<{ open: LiveMatch[]; mine: LiveMatch[] }>({ open: [], mine: [] });
  const isGuest = me.id === 'guest';
  const online = isOnline();

  const bot = botForRating(botRating);

  const reload = useCallback(() => {
    if (isGuest) return;
    listLobby(me.id).then(setLobby).catch(() => {});
  }, [me.id, isGuest]);

  useEffect(() => {
    const t = setTimeout(reload);
    const unsub = isGuest ? () => {} : subscribeLobby(reload);
    return () => { clearTimeout(t); unsub(); };
  }, [reload, isGuest]);

  async function inviteFriend() {
    setBusy(true); setErr(null);
    try {
      const id = await createMatch(me.id, tc, rated);
      setInvite(`${window.location.origin}/jogar?m=${id}`);
      onLive(id);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erro'); setBusy(false); }
  }

  async function randomOpponent() {
    setBusy(true); setErr(null);
    try {
      const candidates = lobby.open.filter((m) => m.whitePlayerId !== me.id);
      if (candidates.length) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        await joinMatch(pick.id, me.id);
        onLive(pick.id);
      } else {
        const id = await createMatch(me.id, tc, rated);
        onLive(id);
      }
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erro'); setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-[560px] space-y-6">
      <h1 className="text-2xl font-bold">Nova partida</h1>

      {saved && (
        <div className="panel flex items-center justify-between p-4">
          <div>
            <div className="text-xs muted">Partida em curso</div>
            <div className="text-sm font-bold">
              {saved.kind === 'bot' ? `🤖 vs ${botForRating(saved.botRating).name}` : '👥 Local'} · {Math.ceil(saved.plies / 2)}ª jogada
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn text-xs" onClick={() => onResume(saved)}>Continuar ▶</button>
            <button className="btn-ghost text-xs" aria-label="Descartar" onClick={onDiscard}>✕</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {([['online', '🌐 Online', 'Outro jogador'], ['bot', '🤖 Bot', 'Treino, offline'], ['local', '👥 Local', '2 no mesmo tel.']] as const).map(([k, t, s]) => (
          <button key={k} onClick={() => setMode(k)}
            className={`tile p-4 text-left ${mode === k ? 'ring-2 ring-[var(--accent)]' : ''} ${k === 'online' && (isGuest || !online) ? 'opacity-40' : ''}`}>
            <div className="font-semibold">{t}</div>
            <div className="text-xs muted">{s}</div>
          </button>
        ))}
      </div>
      {mode === 'online' && isGuest && (
        <p className="text-xs text-amber-400">Partidas online precisam de conta — entra ou cria conta.</p>
      )}

      {mode === 'local' && (
        <div className="panel space-y-3 p-5">
          <p className="text-sm muted">Dois jogadores alternam no mesmo telemóvel. Funciona totalmente offline e a partida fica guardada até terminar.</p>
          <button className="btn w-full py-3 text-base font-bold" onClick={onLocal}>
            ▶ Iniciar partida local
          </button>
        </div>
      )}

      {mode === 'bot' && (
        <div className="panel space-y-4 p-5">
          {/* níveis nomeados */}
          <div className="grid grid-cols-4 gap-2">
            {BOT_LEVELS.map((b) => (
              <button key={b.rating} onClick={() => setBotRating(b.rating)}
                className={`rounded-lg border p-2 text-center text-xs ${botRating === b.rating ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)]'}`}>
                <div className="text-lg">{b.icon}</div>
                <div className="font-semibold">{b.name}</div>
                <div className="muted text-[10px]">{b.rating}</div>
              </button>
            ))}
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="muted">Força do bot</span>
              <span className="chip gold font-bold">{bot.icon} {bot.name} · {botRating}</span>
            </div>
            <input type="range" min={500} max={3000} step={100} value={botRating}
              onChange={(e) => setBotRating(+e.target.value)} className="w-full accent-[#e7b34a]" />
            <div className="flex justify-between text-[10px] muted"><span>500</span><span>3000</span></div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <button onClick={() => setColor('w')}
              className={`rounded-lg border p-2 ${color === 'w' ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)]'}`}>
              ♔ Brancas
            </button>
            <button onClick={() => setColor('b')}
              className={`rounded-lg border p-2 ${color === 'b' ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)]'}`}>
              ♚ Pretas
            </button>
          </div>
          <button className="btn w-full py-3 text-base font-bold" onClick={() => onBot(botRating, color)}>
            ▶ Iniciar partida
          </button>
        </div>
      )}

      {mode === 'online' && !isGuest && (
        <div className="panel space-y-5 p-5">
          <div>
            <div className="mb-2 text-sm muted">Controlo de tempo</div>
            <div className="flex flex-wrap gap-2">
              {TIME_CONTROLS.map((t) => (
                <button key={t.label} onClick={() => setTc(t.seconds)}
                  className={`chip ${tc === t.seconds ? '!border-[var(--accent)] !bg-[var(--accent)]/15 accent' : ''}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between text-sm">
            <span>Partida por rating</span>
            <input type="checkbox" checked={rated} onChange={(e) => setRated(e.target.checked)}
              className="h-4 w-4 accent-[#e7b34a]" />
          </label>
          {invite && (
            <div className="rounded-lg border border-[var(--border)] bg-black/30 p-3 text-xs">
              <p className="mb-1 muted">Link do desafio — envia ao teu amigo:</p>
              <code className="break-all accent">{invite}</code>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-ghost py-3 text-sm font-semibold" onClick={inviteFriend} disabled={busy}>
              🔗 Convidar amigo
            </button>
            <button className="btn py-3 text-sm font-bold" onClick={randomOpponent} disabled={busy}>
              🎲 Adversário aleatório
            </button>
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
        </div>
      )}

      {mode === 'online' && !isGuest && (
        <div className="space-y-4">
          {lobby.open.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold muted">Desafios abertos</h3>
              <div className="space-y-2">
                {lobby.open.map((m) => (
                  <div key={m.id} className="panel flex items-center justify-between p-3 text-sm">
                    <span>{m.whiteName ?? 'Jogador'}
                      <span className="muted ml-1 text-xs">
                        ({m.whiteRating ?? '—'}) · {m.timeControlSeconds ? `${m.timeControlSeconds / 60} min` : 'sem relógio'}
                      </span>
                    </span>
                    <button className="btn text-xs" disabled={busy}
                      onClick={async () => { setBusy(true); await joinMatch(m.id, me.id); onLive(m.id); }}>
                      Aceitar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {lobby.mine.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold muted">As minhas partidas</h3>
              <div className="space-y-2">
                {lobby.mine.slice(0, 5).map((m) => (
                  <button key={m.id} onClick={() => onLive(m.id)}
                    className="panel flex w-full items-center justify-between p-3 text-left text-sm hover:border-[var(--accent)]">
                    <span>{m.whiteName ?? '—'} vs {m.blackName ?? '…'}
                      {m.status === 'finished' && <span className="muted"> · {m.result}</span>}
                    </span>
                    <span className={`text-xs ${m.status === 'active' ? 'text-green-400' : 'muted'}`}>
                      {m.status === 'active' ? 'ao vivo' : m.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- página ----------
function JogarInner() {
  const [me, setMe] = useState<Player | null>(null);
  const [view, setView] = useState<'new' | 'bot' | 'local' | 'live'>('new');
  const [botCfg, setBotCfg] = useState<{ rating: number; color: 'w' | 'b' }>({ rating: 1200, color: 'w' });
  const [matchId, setMatchId] = useState<string | null>(null);
  const [resumeFen, setResumeFen] = useState<string | undefined>();
  const [saved, setSaved] = useState<SavedGame | null>(null);
  const params = useSearchParams();

  useEffect(() => {
    const t = setTimeout(() => setSaved(loadGame()), 0);
    return () => clearTimeout(t);
  }, [view]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const s = await getSession();
      if (!s) {
        const g = getGuest();
        if (g) {
          const { guestAsPlayer } = await import('@/lib/offline');
          setMe(guestAsPlayer(g));
        }
        return;
      }
      const p = await getMyPlayer(s.userId);
      setMe(p);
      if (!p) return;
      const mid = params.get('m');
      if (mid) {
        const m = await getMatch(mid);
        if (m) {
          const mine = m.whitePlayerId === p.id || m.blackPlayerId === p.id;
          if (m.status === 'waiting' && !mine) {
            await joinMatch(mid, p.id).catch(() => {});
          }
          setMatchId(mid);
          setView('live');
        }
      }
    });
    return () => clearTimeout(t);
  }, [params]);

  if (!me) {
    return (
      <div className="py-10 text-center">
        <p className="muted mb-4">Entra ou continua como visitante para jogar.</p>
      </div>
    );
  }

  return (
    <div>
      {view === 'new' && (
        <NewGame me={me} saved={saved}
          onBot={(rating, c) => { setBotCfg({ rating, color: c }); setResumeFen(undefined); setView('bot'); }}
          onLocal={() => { setResumeFen(undefined); setView('local'); }}
          onLive={(id) => { setMatchId(id); setView('live'); }}
          onResume={(s) => {
            setBotCfg({ rating: s.botRating, color: s.color });
            setResumeFen(s.fen);
            setView(s.kind === 'local' ? 'local' : 'bot');
          }}
          onDiscard={() => { saveGame(null); setSaved(null); }} />
      )}
      {(view === 'bot' || view === 'local') && (
        <BotGame player={me} botRating={botCfg.rating} color={botCfg.color}
          local={view === 'local'} resumeFen={resumeFen} key={resumeFen ?? view}
          onExit={() => { setView('new'); setResumeFen(undefined); }} />
      )}
      {view === 'live' && matchId && (
        <LiveGame matchId={matchId} me={me} onExit={() => { setView('new'); setMatchId(null); }} />
      )}
    </div>
  );
}

export default function JogarPage() {
  return (
    <Suspense fallback={<p className="muted py-10 text-center">A carregar…</p>}>
      <JogarInner />
    </Suspense>
  );
}
