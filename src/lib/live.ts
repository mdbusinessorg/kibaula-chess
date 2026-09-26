'use client';

import { supabase } from './client';

export type LiveMatch = {
  id: string;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  whiteName?: string;
  blackName?: string;
  status: 'waiting' | 'active' | 'finished' | 'aborted';
  fen: string;
  result: '1-0' | '0-1' | '1/2-1/2' | null;
  endReason: string | null;
  createdAt: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function map(m: any): LiveMatch {
  return {
    id: m.id,
    whitePlayerId: m.white_player_id, blackPlayerId: m.black_player_id,
    whiteName: m.white?.full_name ?? undefined,
    blackName: m.black?.full_name ?? undefined,
    status: m.status, fen: m.fen, result: m.result,
    endReason: m.end_reason, createdAt: m.created_at,
  };
}

const MATCH_SELECT = '*, white:players!live_matches_white_player_id_fkey(full_name,username), black:players!live_matches_black_player_id_fkey(full_name,username)';

export async function listLobby(playerId: string): Promise<{ open: LiveMatch[]; mine: LiveMatch[] }> {
  const { data: open } = await supabase.from('live_matches')
    .select(MATCH_SELECT).eq('status', 'waiting').order('created_at', { ascending: false });
  const { data: mine } = await supabase.from('live_matches')
    .select(MATCH_SELECT)
    .or(`white_player_id.eq.${playerId},black_player_id.eq.${playerId}`)
    .neq('status', 'waiting')
    .order('created_at', { ascending: false }).limit(10);
  return {
    open: (open ?? []).filter((m) => m.white_player_id !== playerId).map(map),
    mine: (mine ?? []).map(map),
  };
}

export async function getMatch(matchId: string): Promise<LiveMatch | null> {
  const { data } = await supabase.from('live_matches')
    .select(MATCH_SELECT).eq('id', matchId).single();
  return data ? map(data) : null;
}

export async function createMatch(playerId: string): Promise<string> {
  const { data, error } = await supabase.from('live_matches')
    .insert({ white_player_id: playerId }).select('id').single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function joinMatch(matchId: string, playerId: string) {
  const { error } = await supabase.from('live_matches')
    .update({ black_player_id: playerId, status: 'active' })
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

export async function finishMatch(matchId: string, result: LiveMatch['result'], reason: string) {
  await supabase.from('live_matches')
    .update({ status: 'finished', result, end_reason: reason }).eq('id', matchId);
  const m = await getMatch(matchId);
  if (!m?.whitePlayerId || !m.blackPlayerId) return;
  const bump = async (pid: string, field: 'wins' | 'losses' | 'draws', elo: number) => {
    const { data } = await supabase.from('players').select('wins,losses,draws,rating').eq('id', pid).single();
    if (!data) return;
    await supabase.from('players').update({
      [field]: (data[field] as number) + 1,
      rating: Math.max(100, (data.rating as number) + elo),
    }).eq('id', pid);
  };
  if (result === '1-0') { await bump(m.whitePlayerId, 'wins', 15); await bump(m.blackPlayerId, 'losses', -15); }
  if (result === '0-1') { await bump(m.blackPlayerId, 'wins', 15); await bump(m.whitePlayerId, 'losses', -15); }
  if (result === '1/2-1/2') { await bump(m.whitePlayerId, 'draws', 0); await bump(m.blackPlayerId, 'draws', 0); }
}

export async function abortMatch(matchId: string) {
  await supabase.from('live_matches').update({ status: 'aborted' }).eq('id', matchId);
}

export function subscribeMatch(matchId: string, onMove: (ply: number, san: string, uci: string, fen: string) => void, onMatch: (m: { status: string; result: string | null; end_reason: string | null }) => void) {
  const ch = supabase.channel(`live:${matchId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_moves', filter: `match_id=eq.${matchId}` },
      (r) => onMove(r.new.ply, r.new.san, r.new.uci, r.new.fen_after))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_matches', filter: `id=eq.${matchId}` },
      (r) => onMatch(r.new as { status: string; result: string | null; end_reason: string | null }))
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}

export function subscribeLobby(onChange: () => void) {
  const ch = supabase.channel('lobby')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'live_matches' }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}
