'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getSession, getMyPlayer } from '@/lib/auth';
import { listMoves, getMatch, type LiveMatch } from '@/lib/live';
import { analyzeGame, coachText, type GameAnalysis } from '@/lib/analysis';
import { CLASS_META } from '@/lib/engine';
import { EmptyState, LoadingState, CoachBubble, ProgressBar } from '@/components/ui';
import { usePrefs, boardOpts, BOARD_THEMES } from '@/lib/prefs';

function Analyzer({ matchId }: { matchId: string }) {
  const prefs = usePrefs();
  const theme = BOARD_THEMES[prefs.board];
  const [match, setMatch] = useState<LiveMatch | null>(null);
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [ply, setPly] = useState(0);
  const [fen, setFen] = useState(new Chess().fen());
  const [running, setRunning] = useState(false);

  const start = useCallback(async () => {
    const moves = await listMoves(matchId);
    if (!moves.length) return;
    setRunning(true);
    // análise passo a passo (não bloqueia a UI de uma vez)
    const ucis = moves.map((m) => m.uci as string);
    setTimeout(() => {
      const a = analyzeGame(ucis, 1);
      setAnalysis(a);
      setPly(ucis.length);
      setFen(a.moves.at(-1) ? new Chess(a.moves.at(-1)!.fenBefore).fen() : fen);
      // posição final real
      const g = new Chess();
      for (const u of ucis) g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      setFen(g.fen());
      setRunning(false);
    }, 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  useEffect(() => {
    const t = setTimeout(() => {
      getMatch(matchId).then((m) => {
        setMatch(m);
        if (m) void start();
      });
    });
    return () => clearTimeout(t);
  }, [matchId, start]);

  const goTo = (p: number) => {
    if (!analysis) return;
    setPly(p);
    if (p === 0) { setFen(new Chess().fen()); return; }
    const g = new Chess(analysis.moves[p - 1].fenBefore);
    const u = analysis.moves[p - 1].uci;
    g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    setFen(g.fen());
  };

  if (!match) return <LoadingState label="A carregar partida…" />;
  if (running || !analysis) return <LoadingState label="A analisar jogada a jogada…" />;

  const cur = ply > 0 ? analysis.moves[ply - 1] : null;
  const whiteAcc = analysis.accuracyWhite;
  const blackAcc = analysis.accuracyBlack;

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="panel p-3">
          <div className="mb-1 flex justify-between text-sm">
            <span>{match.whiteName ?? 'Brancas'}</span>
            <strong>{whiteAcc}%</strong>
          </div>
          <ProgressBar pct={whiteAcc} color={theme.light} />
        </div>
        <div className="panel p-3">
          <div className="mb-1 flex justify-between text-sm">
            <span>{match.blackName ?? 'Pretas'}</span>
            <strong>{blackAcc}%</strong>
          </div>
          <ProgressBar pct={blackAcc} color={theme.dark} />
        </div>
      </div>

      <div className="chessboard-wrap mx-auto max-w-[420px]">
        <Chessboard options={{ position: fen, allowDragging: false, ...boardOpts(prefs) }} />
      </div>

      {cur && <CoachBubble cls={cur.cls} text={coachText(cur)} />}

      <div className="flex items-center justify-center gap-2">
        <button className="btn-ghost" onClick={() => goTo(0)}>⏮</button>
        <button className="btn-ghost" disabled={ply === 0} onClick={() => goTo(ply - 1)}>◀</button>
        <span className="muted text-sm">{ply}/{analysis.moves.length}</span>
        <button className="btn-ghost" disabled={ply >= analysis.moves.length} onClick={() => goTo(ply + 1)}>▶</button>
        <button className="btn-ghost" onClick={() => goTo(analysis.moves.length)}>⏭</button>
      </div>

      <div className="panel max-h-56 overflow-y-auto p-3 text-xs">
        {Array.from({ length: Math.ceil(analysis.moves.length / 2) }, (_, i) => (
          <div key={i} className="flex gap-2 py-0.5">
            <span className="muted w-6">{i + 1}.</span>
            {[0, 1].map((k) => {
              const m = analysis.moves[i * 2 + k];
              if (!m) return <span key={k} className="flex-1" />;
              const meta = CLASS_META[m.cls];
              return (
                <button key={k} onClick={() => goTo(m.ply)}
                  className={`flex-1 rounded px-1.5 text-left ${m.ply === ply ? 'bg-[var(--accent)]/20' : ''}`}>
                  <span style={{ color: meta.color }}>{meta.icon}</span> {m.san}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {analysis.critical.length > 0 && (
        <div className="panel p-4 text-sm">
          <div className="mb-2 font-semibold">⚠️ Momentos críticos</div>
          <ul className="space-y-1">
            {analysis.critical.map((m) => (
              <li key={m.ply}>
                <button className="accent text-xs" onClick={() => goTo(m.ply)}>
                  {Math.ceil(m.ply / 2)}. {m.san}
                </button>
                <span className="muted text-xs"> — {CLASS_META[m.cls].label}
                  {m.best ? ` (melhor: ${m.best})` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AnaliseInner() {
  const params = useSearchParams();
  const matchId = params.get('m');
  const [history, setHistory] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(async () => {
      const s = await getSession();
      if (s) {
        const p = await getMyPlayer(s.userId);
        if (p) {
          const { data } = await import('@/lib/client').then((m) =>
            m.supabase.from('live_matches')
              .select('*, white:players!live_matches_white_player_id_fkey(full_name,username,rating), black:players!live_matches_black_player_id_fkey(full_name,username,rating)')
              .eq('status', 'finished')
              .or(`white_player_id.eq.${p.id},black_player_id.eq.${p.id}`)
              .order('created_at', { ascending: false }).limit(15));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setHistory((data ?? []).map((m: any) => ({
            id: m.id, whitePlayerId: m.white_player_id, blackPlayerId: m.black_player_id,
            whiteName: m.white?.full_name, blackName: m.black?.full_name,
            status: m.status, fen: m.fen, result: m.result, endReason: m.end_reason,
            timeControlSeconds: m.time_control_seconds, rated: m.rated,
            drawOfferedBy: null, createdAt: m.created_at,
          })));
        }
      }
      setLoading(false);
    });
    return () => clearTimeout(t);
  }, []);

  if (matchId) return <Analyzer matchId={matchId} />;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-bold">🔍 Análise de partidas</h1>
      <p className="text-sm muted">
        Revê as tuas partidas ao vivo com classificação de cada jogada, precisão e momentos críticos.
      </p>
      {loading ? <LoadingState /> : history.length === 0 ? (
        <EmptyState icon="♞" title="Sem partidas terminadas"
          hint="Joga uma partida online e volta aqui para a analisar." />
      ) : (
        <div className="space-y-2">
          {history.map((m) => (
            <Link key={m.id} href={`/analise?m=${m.id}`}
              className="panel flex items-center justify-between p-3 text-sm hover:border-[var(--accent)]">
              <span>{m.whiteName ?? '—'} vs {m.blackName ?? '—'}</span>
              <span className="muted">{m.result} · {m.endReason}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnalisePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AnaliseInner />
    </Suspense>
  );
}
