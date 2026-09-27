'use client';

import { supabase } from './client';

export type LiveMatch = {
  id: string;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  whiteName?: string;
  blackName?: string;
  whiteRating?: number;
  blackRating?: number;
  whiteUser?: string;
  blackUser?: string;
  status: 'waiting' | 'active' | 'finished' | 'aborted';
  fen: string;
  result: '1-0' | '0-1' | '1/2-1/2' | null;
  endReason: string | null;
  timeControlSeconds: number | null;
  rated: boolean;
  drawOfferedBy: string | null;
  createdAt: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function map(m: any): LiveMatch {
  return {
    id: m.id,
    whitePlayerId: m.white_player_id, blackPlayerId: m.black_player_id,
    whiteName: m.white?.full_name ?? undefined,
    blackName: m.black?.full_name ?? undefined,
    whiteRating: m.white?.rating ?? undefined,
    blackRating: m.black?.rating ?? undefined,
    whiteUser: m.white?.username ?? undefined,
    blackUser: m.black?.username ?? undefined,
    status: m.status, fen: m.fen, result: m.result,
    endReason: m.end_reason,
    timeControlSeconds: m.time_control_seconds ?? null,
    rated: m.rated ?? true,
    drawOfferedBy: m.draw_offered_by ?? null,
    createdAt: m.created_at,
  };
}

const MATCH_SELECT =
  '*, white:players!live_matches_white_player_id_fkey(full_name,username,rating), ' +
  'black:players!live_matches_black_player_id_fkey(full_name,username,rating)';

export async function listLobby(playerId: string): Promise<{ open: LiveMatch[]; mine: LiveMatch[] }> {
  const { data: open } = await supabase.from('live_matches')
    .select(MATCH_SELECT).eq('status', 'waiting').order('created_at', { ascending: false });
  const { data: mine } = await supabase.from('live_matches')
    .select(MATCH_SELECT)
    .or(`white_player_id.eq.${playerId},black_player_id.eq.${playerId}`)
    .neq('status', 'waiting')
    .order('created_at', { ascending: false }).limit(15);
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    open: (open ?? []).filter((m: any) => m.white_player_id !== playerId).map(map),
    mine: (mine ?? []).map(map),
  };
}

export async function getMatch(matchId: string): Promise<LiveMatch | null> {
  const { data } = await supabase.from('live_matches')
    .select(MATCH_SELECT).eq('id', matchId).single();
  return data ? map(data) : null;
}

export async function createMatch(
  playerId: string, timeControlSeconds: number | null, rated: boolean,
): Promise<string> {
  const { data, error } = await supabase.from('live_matches')
    .insert({ white_player_id: playerId, time_control_seconds: timeControlSeconds, rated })
    .select('id').single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function joinMatch(matchId: string, playerId: string) {
  const { error } = await supabase.from('live_matches')
    .update({ black_player_id: playerId, status: 'active', last_move_at: new Date().toISOString() })
    .eq('id', matchId).eq('status', 'waiting');
  if (error) throw new Error(error.message);
}

/** Jogada append-only: uma vez gravada nunca se edita nem se anula. */
export async function postMove(
  matchId: string, ply: number, san: string, uci: string, fenAfter: string, playerId: string,
) {
  const { error } = await supabase.from('live_moves')
    .insert({ match_id: matchId, ply, san, uci, fen_after: fenAfter, played_by: playerId });
  if (error) throw new Error(error.message);
  await supabase.from('live_matches')
    .update({ fen: fenAfter, last_move_at: new Date().toISOString() })
    .eq('id', matchId);
}

export async function finishMatch(
  matchId: string, result: LiveMatch['result'], reason: string,
) {
  await supabase.from('live_matches')
    .update({ status: 'finished', result, end_reason: reason, draw_offered_by: null })
    .eq('id', matchId);
  const m = await getMatch(matchId);
  if (!m?.whitePlayerId || !m.blackPlayerId || !m.rated) return;

  // rating separado por controlo de tempo (validado no backend)
  const ratingField = m.timeControlSeconds == null ? 'rating'
    : m.timeControlSeconds <= 180 ? 'rating_blitz'
    : m.timeControlSeconds <= 900 ? 'rating_rapid' : 'rating_classical';

  const bump = async (pid: string, field: 'wins' | 'losses' | 'draws', elo: number) => {
    const { data } = await supabase.from('players')
      .select(`wins,losses,draws,rating,${ratingField}`).eq('id', pid).single();
    if (!data) return;
    const row = data as Record<string, number>;
    const cur = row[ratingField] ?? row.rating;
    const next = Math.max(100, cur + elo);
    await supabase.from('players').update({
      [field]: row[field] + 1,
      rating: Math.max(100, row.rating + elo),
      [ratingField]: next,
    }).eq('id', pid);
    await supabase.from('rating_history')
      .insert({ player_id: pid, match_id: matchId, kind: ratingField, rating: next });
  };
  if (result === '1-0') { await bump(m.whitePlayerId, 'wins', 15); await bump(m.blackPlayerId, 'losses', -15); }
  if (result === '0-1') { await bump(m.blackPlayerId, 'wins', 15); await bump(m.whitePlayerId, 'losses', -15); }
  if (result === '1/2-1/2') { await bump(m.whitePlayerId, 'draws', 0); await bump(m.blackPlayerId, 'draws', 0); }
}

export async function listMoves(matchId: string) {
  const { data } = await supabase.from('live_moves')
    .select('ply,san,uci,fen_after,played_by,played_at')
    .eq('match_id', matchId).order('ply', { ascending: true });
  return data ?? [];
}

// ---------- chat da partida ----------
export type ChatMsg = { id: string; playerId: string; author: string; body: string; at: string };

export async function listChat(matchId: string): Promise<ChatMsg[]> {
  const { data } = await supabase.from('match_chat')
    .select('id,player_id,body,created_at,players(full_name)')
    .eq('match_id', matchId).order('created_at', { ascending: true }).limit(100);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id, playerId: r.player_id, body: r.body,
    author: r.players?.full_name ?? 'Jogador', at: r.created_at,
  }));
}

export async function postChat(matchId: string, playerId: string, body: string) {
  const text = body.trim().slice(0, 300);
  if (!text) return;
  await supabase.from('match_chat').insert({ match_id: matchId, player_id: playerId, body: text });
}

export function subscribeChat(matchId: string, onMsg: () => void) {
  const ch = supabase.channel(`chat:${matchId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_chat', filter: `match_id=eq.${matchId}` }, onMsg)
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}

export async function offerDraw(matchId: string, playerId: string) {
  await supabase.from('live_matches')
    .update({ draw_offered_by: playerId }).eq('id', matchId);
}

export async function respondDraw(matchId: string, accept: boolean) {
  if (accept) {
    await finishMatch(matchId, '1/2-1/2', 'agreement');
  } else {
    await supabase.from('live_matches')
      .update({ draw_offered_by: null }).eq('id', matchId);
  }
}

export async function abortMatch(matchId: string) {
  await supabase.from('live_matches').update({ status: 'aborted' }).eq('id', matchId);
}

export function subscribeMatch(
  matchId: string,
  onMove: () => void,
  onMatch: (u: {
    status: string; result: string | null; end_reason: string | null;
    draw_offered_by: string | null; black_player_id: string | null;
  }) => void,
) {
  const ch = supabase.channel(`live:${matchId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_moves', filter: `match_id=eq.${matchId}` },
      () => onMove())
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_matches', filter: `id=eq.${matchId}` },
      (r) => onMatch(r.new as {
        status: string; result: string | null; end_reason: string | null;
        draw_offered_by: string | null; black_player_id: string | null;
      }))
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}

export function subscribeLobby(onChange: () => void) {
  const ch = supabase.channel('lobby')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'live_matches' }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}
