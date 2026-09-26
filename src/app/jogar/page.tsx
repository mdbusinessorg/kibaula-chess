'use client';

import { useCallback, useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getSession, getMyPlayer } from '@/lib/auth';
import type { Player } from '@/lib/types';
import {
  listLobby, createMatch, joinMatch, postMove, finishMatch, abortMatch,
  subscribeMatch, subscribeLobby, getMatch, type LiveMatch,
} from '@/lib/live';
import { supabase } from '@/lib/client';

// ---------- motor do bot (minimax com avaliação material) ----------
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

function botMove(g: Chess, level: number): string | null {
  const moves = g.moves({ verbose: true });
  if (!moves.length) return null;
  if (level <= 1) return moves[Math.floor(Math.random() * moves.length)].lan;
  if (level === 2) {
    const good = moves.filter((m) => m.captured || m.san.includes('+') || m.san.includes('#'));
    const pick = good.length && Math.random() < 0.8 ? good : moves;
    return pick[Math.floor(Math.random() * pick.length)].lan;
  }
  return bestMove(g, 2);
}

function gameStatus(g: Chess): string {
  if (g.isCheckmate()) return `Xeque-mate — vencem as ${g.turn() === 'w' ? 'pretas' : 'brancas'}`;
  if (g.isStalemate()) return 'Empate por afogamento';
  if (g.isThreefoldRepetition()) return 'Empate por repetição';
  if (g.isInsufficientMaterial()) return 'Empate por material insuficiente';
  if (g.isDraw()) return 'Empate';
  return `${g.turn() === 'w' ? 'Brancas' : 'Pretas'} a jogar${g.inCheck() ? ' — xeque!' : ''}`;
}

// ---------- jogo contra o bot ----------
function BotGame({ player }: { player: Player }) {
  const [game] = useState(() => new Chess());
  const [fen, setFen] = useState(game.fen());
  const [status, setStatus] = useState(gameStatus(game));
  const [level, setLevel] = useState(2);
  const [myColor, setMyColor] = useState<'w' | 'b'>('w');
  const [started, setStarted] = useState(false);
  const [over, setOver] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const afterMove = useCallback((g: Chess) => {
    setFen(g.fen());
    setLog(g.history());
    setStatus(gameStatus(g));
    if (g.isGameOver()) {
      setOver(true);
      const res = g.isCheckmate() ? (g.turn() === 'w' ? '0-1' : '1-0') : '1/2-1/2';
      const mine = (res === '1-0' && myColor === 'w') || (res === '0-1' && myColor === 'b');
      supabase.from('players').select('wins,losses,draws,rating').eq('id', player.id).single()
        .then(({ data }) => {
          if (!data) return;
          const f = g.isCheckmate() ? (mine ? 'wins' : 'losses') : 'draws';
          supabase.from('players').update({ [f]: (data[f] as number) + 1 }).eq('id', player.id);
        });
    }
  }, [myColor, player.id]);

  function onDrop({ sourceSquare, targetSquare }: { piece: unknown; sourceSquare: string; targetSquare: string | null }) {
    const g = game;
    if (!started || g.isGameOver() || g.turn() !== myColor || !targetSquare) return false;
    try {
      const m = g.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      if (!m) return false;
    } catch { return false; }
    afterMove(g);
    setTimeout(() => {
      const mv = botMove(g, level);
      if (mv && !g.isGameOver()) { g.move(mv); afterMove(g); }
    }, 350);
    return true;
  }

  function restart(color: 'w' | 'b', lvl = level) {
    game.reset();
    setMyColor(color);
    setFen(game.fen());
    setLog([]);
    setStatus(gameStatus(game));
    setOver(false);
    setStarted(true);
    if (color === 'b') {
      setTimeout(() => {
        const mv = botMove(game, lvl);
        if (mv) { game.move(mv); afterMove(game); }
      }, 300);
    }
  }

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_260px]">
      <div className="mx-auto w-full max-w-[460px]">
        <Chessboard options={{
          position: fen,
          boardOrientation: myColor === 'w' ? 'white' : 'black',
          onPieceDrop: onDrop,
        }} />
      </div>
      <div className="space-y-3">
        <div className="panel p-4 text-sm">
          <div className="mb-2 font-semibold">Contra o Bot 🤖</div>
          <p className="muted">{status}</p>
        </div>
        <div className="panel space-y-2 p-4 text-sm">
          <label className="muted block text-xs">Nível do bot</label>
          <select className="w-full" value={level}
            onChange={(e) => { const l = +e.target.value; setLevel(l); if (started) restart(myColor, l); }}>
            <option value={1}>Fácil</option>
            <option value={2}>Médio</option>
            <option value={3}>Difícil</option>
          </select>
          <div className="flex gap-2">
            <button className="btn flex-1 text-sm" onClick={() => restart('w')}>♔ Brancas</button>
            <button className="btn flex-1 text-sm" onClick={() => restart('b')}>♚ Pretas</button>
          </div>
          {!started && <p className="text-xs muted">Escolhe a cor para começar.</p>}
          {over && <p className="text-xs muted">Partida terminada — nova partida em cima.</p>}
        </div>
        <div className="panel max-h-56 overflow-y-auto p-4 text-xs muted">
          {log.length ? log.map((m, i) => (
            <span key={i}>{i % 2 === 0 ? `${i / 2 + 1}. ` : ''}{m} </span>
          )) : 'Sem jogadas ainda.'}
        </div>
      </div>
    </div>
  );
}

// ---------- partida online ao vivo ----------
function LiveGame({ matchId, me, onExit }: { matchId: string; me: Player; onExit: () => void }) {
  const [game] = useState(() => new Chess());
  const [fen, setFen] = useState(game.fen());
  const [applied, setApplied] = useState(0);
  const [match, setMatch] = useState<LiveMatch | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const myColor: 'w' | 'b' | null = !match ? null
    : match.whitePlayerId === me.id ? 'w'
    : match.blackPlayerId === me.id ? 'b' : null;
  const active = match?.status === 'active';
  const myTurn = active && !!myColor && game.turn() === myColor;

  const rebuild = useCallback(async () => {
    const { data: moves } = await supabase.from('live_moves')
      .select('ply,uci').eq('match_id', matchId).order('ply');
    const g = new Chess();
    for (const m of moves ?? []) {
      g.move({ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), promotion: m.uci[4] ?? 'q' });
    }
    game.load(g.fen());
    setApplied(moves?.length ?? 0);
    setFen(g.fen());
    setLog(g.history());
  }, [matchId, game]);

  useEffect(() => {
    const t = setTimeout(() => {
      getMatch(matchId).then(setMatch);
      rebuild();
    });
    const unsub = subscribeMatch(
      matchId,
      () => { rebuild(); },
      (u) => {
        setMatch((m) => m ? { ...m, status: u.status as LiveMatch['status'], result: u.result as LiveMatch['result'], endReason: u.end_reason } : m);
      },
    );
    return () => { clearTimeout(t); unsub(); };
  }, [matchId, rebuild]);

  function onDrop({ sourceSquare, targetSquare }: { piece: unknown; sourceSquare: string; targetSquare: string | null }) {
    if (!myTurn || !targetSquare) return false;
    let mv;
    try {
      mv = game.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      if (!mv) return false;
    } catch { return false; }
    const ply = applied + 1;
    setApplied(ply);
    setFen(game.fen());
    setLog(game.history());
    setErr(null);
    // jogada gravada de imediato — irreversível (sem refazer)
    postMove(matchId, ply, mv.san, mv.lan, game.fen(), me.id)
      .then(() => {
        if (game.isCheckmate()) finishMatch(matchId, myColor === 'w' ? '1-0' : '0-1', 'checkmate');
        else if (game.isStalemate()) finishMatch(matchId, '1/2-1/2', 'stalemate');
        else if (game.isInsufficientMaterial()) finishMatch(matchId, '1/2-1/2', 'insufficient_material');
        else if (game.isThreefoldRepetition() || game.isDraw()) finishMatch(matchId, '1/2-1/2', 'draw');
      })
      .catch((e) => setErr(e.message));
    return true;
  }

  function resign() {
    if (!active || !myColor) return;
    finishMatch(matchId, myColor === 'w' ? '0-1' : '1-0', 'resign');
  }

  if (!match) return <p className="muted py-10 text-center">A carregar partida…</p>;

  const opp = myColor === 'w' ? match.blackName : match.whiteName;
  const finished = match.status === 'finished';

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_260px]">
      <div className="mx-auto w-full max-w-[460px]">
        <Chessboard options={{
          position: fen,
          boardOrientation: myColor === 'b' ? 'black' : 'white',
          onPieceDrop: onDrop,
          allowDragging: !!myTurn,
        }} />
      </div>
      <div className="space-y-3">
        <div className="panel p-4 text-sm">
          <div className="mb-2 font-semibold">Ao vivo 🌐</div>
          <p className="muted">
            {match.status === 'waiting' && 'A aguardar adversário…'}
            {active && (myTurn ? 'A tua vez.' : `Vez de ${opp ?? 'adversário'}…`)}
            {finished && `Terminado: ${match.result} (${match.endReason})`}
            {match.status === 'aborted' && 'Partida abandonada.'}
          </p>
          <p className="mt-1 text-xs muted">
            Tu: {me.username} ({myColor === 'w' ? 'brancas' : 'pretas'}) · Oponente: {opp ?? '—'}
          </p>
          <p className="mt-2 text-[11px] text-amber-400/80">
            Jogadas ao vivo são permanentes — não é possível refazer.
          </p>
          {err && <p className="mt-1 text-xs text-red-400">{err}</p>}
        </div>
        <div className="flex gap-2">
          {active && <button className="btn flex-1 text-sm" onClick={resign}>Desistir</button>}
          {match.status === 'waiting' && match.whitePlayerId === me.id && (
            <button className="btn flex-1 text-sm" onClick={() => { abortMatch(matchId); onExit(); }}>
              Cancelar desafio
            </button>
          )}
          <button className="btn flex-1 text-sm" onClick={onExit}>Voltar ao lobby</button>
        </div>
        <div className="panel max-h-56 overflow-y-auto p-4 text-xs muted">
          {log.length ? log.map((m, i) => (
            <span key={i}>{i % 2 === 0 ? `${i / 2 + 1}. ` : ''}{m} </span>
          )) : 'Sem jogadas ainda.'}
        </div>
      </div>
    </div>
  );
}

// ---------- lobby online ----------
function Lobby({ me, onEnter }: { me: Player; onEnter: (id: string) => void }) {
  const [open, setOpen] = useState<LiveMatch[]>([]);
  const [mine, setMine] = useState<LiveMatch[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(() => {
    listLobby(me.id).then((l) => { setOpen(l.open); setMine(l.mine); }).catch(() => {});
  }, [me.id]);

  useEffect(() => {
    const t = setTimeout(reload);
    const unsub = subscribeLobby(reload);
    return () => { clearTimeout(t); unsub(); };
  }, [reload]);

  async function create() {
    setBusy(true); setErr(null);
    try { onEnter(await createMatch(me.id)); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Erro'); setBusy(false); }
  }

  async function accept(id: string) {
    setBusy(true); setErr(null);
    try { await joinMatch(id, me.id); onEnter(id); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Erro'); setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <div className="panel flex items-center justify-between p-4">
        <div>
          <h2 className="font-semibold">Confrontos ao vivo</h2>
          <p className="text-xs muted">Desafia um jogador — a partida corre online em tempo real, sem refazer jogadas.</p>
        </div>
        <button className="btn text-sm" onClick={create} disabled={busy}>+ Criar desafio</button>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}

      <div>
        <h3 className="mb-2 text-sm font-semibold muted">Desafios abertos</h3>
        <div className="space-y-2">
          {open.length === 0 && <p className="text-sm muted">Nenhum desafio aberto. Cria o teu!</p>}
          {open.map((m) => (
            <div key={m.id} className="panel flex items-center justify-between p-3 text-sm">
              <span>{m.whiteName ?? 'Jogador'} <span className="muted text-xs">(brancas)</span></span>
              <button className="btn text-xs" onClick={() => accept(m.id)} disabled={busy}>
                Aceitar (pretas)
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold muted">As minhas partidas</h3>
        <div className="space-y-2">
          {mine.length === 0 && <p className="text-sm muted">Ainda sem partidas.</p>}
          {mine.map((m) => (
            <button key={m.id} onClick={() => onEnter(m.id)}
              className="panel flex w-full items-center justify-between p-3 text-left text-sm hover:border-[var(--accent)]">
              <span>
                {m.whiteName ?? '—'} vs {m.blackName ?? '…'}
                {m.status === 'finished' && <span className="muted"> · {m.result}</span>}
              </span>
              <span className={`text-xs ${m.status === 'active' ? 'text-green-400' : 'muted'}`}>
                {m.status === 'active' ? 'ao vivo' : m.status}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- página ----------
export default function JogarPage() {
  const [me, setMe] = useState<Player | null>(null);
  const [tab, setTab] = useState<'bot' | 'online'>('bot');
  const [matchId, setMatchId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      const s = await getSession();
      if (!s) return;
      setMe(await getMyPlayer(s.userId));
    });
    return () => clearTimeout(t);
  }, []);

  if (!me) return <p className="muted py-10 text-center">A carregar…</p>;

  return (
    <div>
      <div className="mb-5 flex items-center gap-4">
        <h1 className="text-2xl font-bold">Jogar</h1>
        <div className="flex gap-1 rounded-lg border border-[var(--border)] p-1 text-sm">
          {([['bot', 'Contra o Bot'], ['online', 'Online ao vivo']] as const).map(([k, l]) => (
            <button key={k} onClick={() => { setTab(k); setMatchId(null); }}
              className={`rounded-md px-3 py-1.5 ${tab === k ? 'bg-[var(--accent)] font-semibold text-black' : 'muted'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {tab === 'bot' && <BotGame player={me} />}
      {tab === 'online' && !matchId && <Lobby me={me} onEnter={setMatchId} />}
      {tab === 'online' && matchId && (
        <LiveGame matchId={matchId} me={me} onExit={() => setMatchId(null)} />
      )}
    </div>
  );
}
