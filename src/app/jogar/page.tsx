'use client';

import { Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import { Chess, type Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getSession, getMyPlayer } from '@/lib/auth';
import type { Player } from '@/lib/types';
import {
  listLobby, createMatch, joinMatch, postMove, finishMatch, abortMatch,
  offerDraw, respondDraw,
  subscribeMatch, subscribeLobby, getMatch, type LiveMatch,
} from '@/lib/live';
import { supabase } from '@/lib/client';
import { sounds } from '@/lib/sounds';

// ---------- motor do bot ----------
const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function evalBoard(g: Chess): number {
  let s = 0;
  for (const row of g.board()) for (const c of row) {
    if (c) s += VAL[c.type] * (c.color === 'w' ? 1 : -1);
  }
  return s;
}

function negamax(g: Chess, depth: number, alpha: number, beta: number): number {
  if (depth === 0 || g.isGameOver()) {
    if (g.isCheckmate()) return -10000;
    if (g.isDraw() || g.isStalemate()) return 0;
    return evalBoard(g);
  }
  let best = -Infinity;
  for (const m of g.moves()) {
    g.move(m);
    best = Math.max(best, -negamax(g, depth - 1, -beta, -alpha));
    g.undo();
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

function bestMove(g: Chess, depth: number): string | null {
  const moves = g.moves({ verbose: true });
  if (!moves.length) return null;
  const sign = g.turn() === 'w' ? 1 : -1;
  let best = -Infinity;
  let chosen: string[] = [];
  for (const m of moves) {
    g.move(m);
    const score = -negamax(g, depth - 1, -Infinity, Infinity) * sign;
    g.undo();
    if (score > best) { best = score; chosen = [m.lan]; }
    else if (score === best) chosen.push(m.lan);
  }
  return chosen[Math.floor(Math.random() * chosen.length)] ?? null;
}

/** Força do bot calibrada por rating 500–3000. */
function botMove(g: Chess, rating: number): string | null {
  const moves = g.moves({ verbose: true });
  if (!moves.length) return null;
  const depth = rating >= 2200 ? 3 : rating >= 1300 ? 2 : 1;
  const blunder = Math.max(0, (3000 - rating) / 3000) * 0.5;
  if (depth === 1) {
    if (Math.random() < blunder) {
      return moves[Math.floor(Math.random() * moves.length)].lan;
    }
    const good = moves.filter((m) => m.captured || m.san.includes('+') || m.san.includes('#'));
    const pick = good.length ? good : moves;
    return pick[Math.floor(Math.random() * pick.length)].lan;
  }
  if (Math.random() < blunder) {
    return moves[Math.floor(Math.random() * moves.length)].lan;
  }
  return bestMove(g, depth);
}

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

// ---------- pontinhos de movimentos legais ----------
const DOT_BG = 'radial-gradient(circle, rgba(0,0,0,.4) 20%, transparent 23%)';
const CAPTURE_RING = 'radial-gradient(circle, transparent 58%, rgba(239,68,68,.85) 62%, rgba(239,68,68,.85) 66%, transparent 70%)';

function useHints(game: Chess, canMove: boolean, tryMove: (from: string, to: string) => boolean) {
  const [selected, setSelected] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  const targets = selected
    ? game.moves({ square: selected as Square, verbose: true })
    : [];

  const styles: Record<string, CSSProperties> = {};
  if (selected) {
    styles[selected] = { boxShadow: 'inset 0 0 0 3px var(--accent)', backgroundColor: 'rgba(168,85,247,.22)' };
  }
  for (const m of targets) {
    styles[m.to] = m.captured
      ? { backgroundImage: CAPTURE_RING, backgroundSize: '100% 100%' }
      : { backgroundImage: DOT_BG, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' };
  }
  if (lastMove) {
    for (const s of [lastMove.from, lastMove.to]) {
      styles[s] = { ...(styles[s] ?? {}), backgroundColor: 'rgba(250,204,21,.22)' };
    }
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

const TIME_CONTROLS: { label: string; seconds: number | null }[] = [
  { label: 'Sem relógio', seconds: null },
  { label: 'Bullet · 1 min', seconds: 60 },
  { label: 'Blitz · 5 min', seconds: 300 },
  { label: 'Rápida · 10 min', seconds: 600 },
  { label: 'Clássica · 30 min', seconds: 1800 },
];

// ---------- cartão de jogador com relógio ----------
function PlayerCard({ name, rating, clock, active }: {
  name: string; rating?: number; clock: number | null; active: boolean;
}) {
  return (
    <div className={`panel flex items-center justify-between p-3 ${active ? 'ring-1 ring-[var(--accent)]' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="tile-icon !h-10 !w-10 text-lg">👤</span>
        <div>
          <div className="text-sm font-semibold">{name}</div>
          {rating != null && <div className="text-xs muted">Rating {rating}</div>}
        </div>
      </div>
      {clock != null && (
        <span className={`rounded-lg px-3 py-1 font-mono text-lg font-bold ${active ? 'bg-[var(--accent)] text-black' : 'bg-black/40'}`}>
          {fmtClock(clock)}
        </span>
      )}
    </div>
  );
}

// ---------- jogo contra o bot ----------
function BotGame({ player, botRating, color, onExit }: {
  player: Player; botRating: number; color: 'w' | 'b'; onExit: () => void;
}) {
  const [game] = useState(() => new Chess());
  const [fen, setFen] = useState(game.fen());
  const [status, setStatus] = useState(gameStatus(game));
  const [over, setOver] = useState(false);
  const [log, setLog] = useState<{ san: string; t: number }[]>([]);
  const lastMoveAt = useRef(0);
  const markMoveRef = useRef<(f: string, t: string) => void>(() => {});

  const afterMove = useCallback((g: Chess) => {
    setFen(g.fen());
    const now = Date.now();
    const elapsed = lastMoveAt.current ? (now - lastMoveAt.current) / 1000 : 0;
    lastMoveAt.current = now;
    setLog((prev) => g.history().map((san, i) => ({
      san, t: i < prev.length ? prev[i].t : elapsed,
    })));
    // som da jogada
    const last = g.history({ verbose: true }).at(-1);
    if (last) {
      if (last.captured) sounds.capture(); else sounds.move();
      setTimeout(() => { if (g.inCheck() && !g.isGameOver()) sounds.check(); }, 80);
      markMoveRef.current(last.from, last.to);
    }
    setStatus(gameStatus(g));
    if (g.isGameOver()) {
      setOver(true);
      const res = g.isCheckmate() ? (g.turn() === 'w' ? '0-1' : '1-0') : '1/2-1/2';
      const mine = (res === '1-0' && color === 'w') || (res === '0-1' && color === 'b');
      if (g.isCheckmate() && mine) sounds.win(); else sounds.end();
      supabase.from('players').select('wins,losses,draws,rating').eq('id', player.id).single()
        .then(({ data }) => {
          if (!data) return;
          const f = g.isCheckmate() ? (mine ? 'wins' : 'losses') : 'draws';
          supabase.from('players').update({ [f]: (data[f] as number) + 1 }).eq('id', player.id);
        });
    }
  }, [color, player.id]);

  function tryMove(from: string, to: string): boolean {
    const g = game;
    if (g.isGameOver() || g.turn() !== color) return false;
    try {
      const m = g.move({ from, to, promotion: 'q' });
      if (!m) { sounds.illegal(); return false; }
    } catch { sounds.illegal(); return false; }
    afterMove(g);
    setTimeout(() => {
      const mv = botMove(g, botRating);
      if (mv && !g.isGameOver()) { g.move(mv); afterMove(g); }
    }, 350);
    return true;
  }

  const hints = useHints(game, !over && game.turn() === color, tryMove);
  useEffect(() => { markMoveRef.current = hints.markMove; }, [hints]);

  function onDrop({ sourceSquare, targetSquare }: { piece: unknown; sourceSquare: string; targetSquare: string | null }) {
    if (!targetSquare) return false;
    return tryMove(sourceSquare, targetSquare);
  }

  useEffect(() => {
    sounds.start();
    if (color === 'b') {
      const t = setTimeout(() => {
        const mv = botMove(game, botRating);
        if (mv) { game.move(mv); afterMove(game); }
      }, 400);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_280px]">
      <div className="mx-auto w-full max-w-[460px] space-y-3">
        <PlayerCard name={`Bot Kibaúla`} rating={botRating} clock={null} active={game.turn() !== color && !over} />
        <Chessboard options={{
          position: fen,
          boardOrientation: color === 'w' ? 'white' : 'black',
          onPieceDrop: onDrop,
          onSquareClick: hints.onSquareClick,
          squareStyles: hints.squareStyles,
          allowDragging: !over,
        }} />
        <PlayerCard name={player.username} rating={player.rating} clock={null} active={game.turn() === color && !over} />
      </div>
      <div className="space-y-3">
        <div className="panel p-4 text-sm">
          <p className="muted">{status}</p>
          <p className="mt-1 text-xs muted">Bot nível {botRating} · tu jogas de {color === 'w' ? 'brancas' : 'pretas'}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost flex-1 text-sm" onClick={onExit}>← Nova partida</button>
        </div>
        <div className="panel max-h-64 overflow-y-auto p-4 text-xs">
          {log.length ? log.map((m, i) => (
            <span key={i} className="muted">
              {i % 2 === 0 ? `${i / 2 + 1}. ` : ''}
              <span className="text-[var(--text)]">{m.san}</span>{' '}
            </span>
          )) : <span className="muted">Sem jogadas ainda.</span>}
        </div>
        {over && <button className="btn w-full text-sm" onClick={onExit}>Nova partida</button>}
      </div>
    </div>
  );
}

// ---------- partida online ao vivo ----------
type TimedMove = { ply: number; san: string; uci: string; playedAt: number };

function LiveGame({ matchId, me, onExit }: { matchId: string; me: Player; onExit: () => void }) {
  const [game] = useState(() => new Chess());
  const [fen, setFen] = useState(game.fen());
  const [applied, setApplied] = useState(0);
  const [match, setMatch] = useState<LiveMatch | null>(null);
  const [moves, setMoves] = useState<TimedMove[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const lastPly = useRef(0);
  const startedRef = useRef(false);

  const myColor: 'w' | 'b' | null = !match ? null
    : match.whitePlayerId === me.id ? 'w'
    : match.blackPlayerId === me.id ? 'b' : null;
  const active = match?.status === 'active';
  const myTurn = active && !!myColor && game.turn() === myColor;

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
    // som quando chega jogada nova (do adversário via realtime)
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
    const t = setTimeout(() => { getMatch(matchId).then(setMatch); rebuild(); });
    const iv = setInterval(() => setTick((x) => x + 1), 1000);
    const unsub = subscribeMatch(
      matchId,
      () => { rebuild(); },
      (u) => {
        setMatch((m) => m ? {
          ...m,
          status: u.status as LiveMatch['status'],
          result: u.result as LiveMatch['result'],
          endReason: u.end_reason,
          drawOfferedBy: u.draw_offered_by,
          blackPlayerId: u.black_player_id ?? m.blackPlayerId,
        } : m);
      },
    );
    return () => { clearTimeout(t); clearInterval(iv); unsub(); };
  }, [matchId, rebuild]);

  // relógios: tempo restante por lado
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

  // som de início + queda de bandeira + tick final
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

  function tryMove(from: string, to: string): boolean {
    if (!myTurn) return false;
    let mv;
    try {
      mv = game.move({ from, to, promotion: 'q' });
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
      })
      .catch((e) => setErr(e.message));
    return true;
  }

  const hints = useHints(game, !!myTurn, tryMove);

  function onDrop({ sourceSquare, targetSquare }: { piece: unknown; sourceSquare: string; targetSquare: string | null }) {
    if (!targetSquare) return false;
    return tryMove(sourceSquare, targetSquare);
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
        <PlayerCard
          name={oppName ?? 'A aguardar adversário…'}
          rating={oppRating}
          clock={clockFor(oppColor)}
          active={!!active && game.turn() === oppColor}
        />
        <Chessboard options={{
          position: fen,
          boardOrientation: myColor === 'b' ? 'black' : 'white',
          onPieceDrop: onDrop,
          onSquareClick: hints.onSquareClick,
          squareStyles: hints.squareStyles,
          allowDragging: !!myTurn,
        }} />
        <PlayerCard
          name={me.username}
          rating={me.rating}
          clock={clockFor(myColor ?? 'w')}
          active={!!myTurn}
        />
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
            <button className="btn-ghost text-sm" onClick={onExit}>⋯ Mais</button>
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
        <div className="panel max-h-64 overflow-y-auto p-4 text-xs">
          {moves.length ? moves.map((m, i) => {
            const prev = i === 0 ? (moves[0].playedAt) : moves[i - 1].playedAt;
            const dt = i === 0 ? 0 : (m.playedAt - prev) / 1000;
            return (
              <span key={m.ply} className="muted">
                {i % 2 === 0 ? `${m.ply / 2 + 0.5 | 0}. ` : ''}
                <span className="text-[var(--text)]">{m.san}</span>
                <span className="ml-1 text-[10px]">{dt ? `+${fmtClock(dt)}` : ''}</span>{' '}
              </span>
            );
          }) : <span className="muted">Sem jogadas ainda.</span>}
        </div>
        {!active && match.status !== 'waiting' && (
          <button className="btn w-full text-sm" onClick={onExit}>← Voltar</button>
        )}
      </div>
    </div>
  );
}

// ---------- ecrã Nova Partida (mockup) ----------
function NewGame({ me, onBot, onLive }: {
  me: Player;
  onBot: (rating: number, color: 'w' | 'b') => void;
  onLive: (id: string) => void;
}) {
  const [mode, setMode] = useState<'online' | 'bot'>('online');
  const [botRating, setBotRating] = useState(1200);
  const [color, setColor] = useState<'w' | 'b'>('w');
  const [tc, setTc] = useState<number | null>(1800);
  const [rated, setRated] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [lobby, setLobby] = useState<{ open: LiveMatch[]; mine: LiveMatch[] }>({ open: [], mine: [] });

  const reload = useCallback(() => {
    listLobby(me.id).then(setLobby).catch(() => {});
  }, [me.id]);

  useEffect(() => {
    const t = setTimeout(reload);
    const unsub = subscribeLobby(reload);
    return () => { clearTimeout(t); unsub(); };
  }, [reload]);

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

      {/* modo */}
      <div className="grid grid-cols-2 gap-3">
        {([['online', '🌐 Online', 'Contra outro jogador'], ['bot', '🤖 Bot', 'Treino offline']] as const).map(([k, t, s]) => (
          <button key={k} onClick={() => setMode(k)}
            className={`tile p-4 text-left ${mode === k ? 'ring-2 ring-[var(--accent)]' : ''}`}>
            <div className="font-semibold">{t}</div>
            <div className="text-xs muted">{s}</div>
          </button>
        ))}
      </div>

      {mode === 'bot' && (
        <div className="panel space-y-4 p-5">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="muted">Força do bot</span>
              <span className="chip gold font-bold">{botRating}</span>
            </div>
            <input type="range" min={500} max={3000} step={100} value={botRating}
              onChange={(e) => setBotRating(+e.target.value)} className="w-full accent-[#a855f7]" />
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

      {mode === 'online' && (
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
              className="h-4 w-4 accent-[#a855f7]" />
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

      {/* lobby */}
      {mode === 'online' && (
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
  const [view, setView] = useState<'new' | 'bot' | 'live'>('new');
  const [botCfg, setBotCfg] = useState<{ rating: number; color: 'w' | 'b' }>({ rating: 1200, color: 'w' });
  const [matchId, setMatchId] = useState<string | null>(null);
  const params = useSearchParams();

  useEffect(() => {
    const t = setTimeout(async () => {
      const s = await getSession();
      if (!s) return;
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

  if (!me) return <p className="muted py-10 text-center">A carregar…</p>;

  return (
    <div>
      {view === 'new' && (
        <NewGame
          me={me}
          onBot={(rating, c) => { setBotCfg({ rating, color: c }); setView('bot'); }}
          onLive={(id) => { setMatchId(id); setView('live'); }}
        />
      )}
      {view === 'bot' && (
        <BotGame player={me} botRating={botCfg.rating} color={botCfg.color}
          onExit={() => setView('new')} />
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
