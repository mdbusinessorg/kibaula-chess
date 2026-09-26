import { getSupabase } from './supabase';
import { FALLBACK_COURSES } from './seed';
import type {
  ClassUnit, Course, Player, RankingMethod, Season, Tournament,
} from './types';

export function usingFallback(): boolean {
  return getSupabase() === null;
}

type CourseRow = {
  course_id: string; name: string; slug: string; abbreviation: string;
  icon: string | null; players: number; avg_rating: number; wins: number;
  games: number; collective_score: number;
};

function rankCourses(rows: CourseRow[], method: RankingMethod): Course[] {
  const key: Record<RankingMethod, (r: CourseRow) => number> = {
    avg_rating: (r) => r.avg_rating,
    collective_score: (r) => r.collective_score,
    wins: (r) => r.wins,
    participation: (r) => r.players,
    tournaments: (r) => r.wins, // vitórias em torneios via matches
  };
  const sorted = [...rows].sort((a, b) => key[method](b) - key[method](a));
  return sorted.map((r, i) => ({
    id: r.course_id, name: r.name, slug: r.slug, abbreviation: r.abbreviation,
    icon: r.icon, shortDescription: null, educationType: 'Ensino Médio',
    players: r.players, avgRating: r.avg_rating, wins: r.wins,
    games: r.games, collectiveScore: r.collective_score, rank: i + 1,
  }));
}

export async function getRankingMethod(): Promise<RankingMethod> {
  const sb = getSupabase();
  if (!sb) return 'avg_rating';
  const { data } = await sb.from('ranking_config').select('method').eq('id', 1).single();
  return (data?.method as RankingMethod) ?? 'avg_rating';
}

export async function getCourses(): Promise<Course[]> {
  const sb = getSupabase();
  const method = await getRankingMethod();
  if (!sb) {
    return FALLBACK_COURSES.map((c, i) => ({
      id: c.slug, name: c.name, slug: c.slug, abbreviation: c.abbr, icon: c.icon,
      shortDescription: null, educationType: 'Ensino Médio',
      players: 0, avgRating: 0, wins: 0, games: 0, collectiveScore: 0, rank: i + 1,
    }));
  }
  const { data } = await sb.from('course_stats').select('*');
  return rankCourses((data ?? []) as CourseRow[], method);
}

export async function getClasses(): Promise<ClassUnit[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from('class_stats').select('*');
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.class_id as string, name: r.class_name as string,
    gradeLabel: (r.grade_label as string) ?? null,
    courseId: r.course_id as string, courseName: r.course_name as string,
    courseAbbr: r.abbreviation as string, players: r.players as number,
    avgRating: r.avg_rating as number, wins: r.wins as number, games: r.games as number,
  }));
}

export async function getPlayers(filter?: {
  courseId?: string; classId?: string;
}): Promise<Player[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let q = sb
    .from('players')
    .select('*, courses(name, abbreviation), classes(name, grade_label), academic_years(label)')
    .order('rating', { ascending: false });
  if (filter?.courseId) q = q.eq('course_id', filter.courseId);
  if (filter?.classId) q = q.eq('class_id', filter.classId);
  const { data } = await q;
  return (data ?? []).map(mapPlayer);
}

export async function getPlayer(username: string): Promise<Player | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from('players')
    .select('*, courses(name, abbreviation), classes(name, grade_label), academic_years(label)')
    .eq('username', username)
    .single();
  return data ? mapPlayer(data) : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPlayer(r: any): Player {
  return {
    id: r.id, fullName: r.full_name, username: r.username, rating: r.rating,
    wins: r.wins, losses: r.losses, draws: r.draws, puzzlesSolved: r.puzzles_solved,
    status: r.status, inpVerified: r.inp_verified,
    courseId: r.course_id, courseName: r.courses?.name ?? null,
    courseAbbr: r.courses?.abbreviation ?? null,
    classId: r.class_id, className: r.classes?.name ?? null,
    gradeLabel: r.classes?.grade_label ?? null,
    academicYear: r.academic_years?.label ?? null,
  };
}

export async function getSeasons(): Promise<Season[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from('seasons').select('*').order('starts_on', { ascending: false });
  return (data ?? []).map((s: Record<string, unknown>) => ({
    id: s.id as string, name: s.name as string,
    startsOn: (s.starts_on as string) ?? null, endsOn: (s.ends_on as string) ?? null,
    active: s.active as boolean,
  }));
}

export async function getTournaments(): Promise<Tournament[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from('tournaments').select('*').order('created_at', { ascending: false });
  return (data ?? []).map((t: Record<string, unknown>) => ({
    id: t.id as string, kind: t.kind as 'championship' | 'cup',
    name: t.name as string, status: t.status as string,
    format: (t.format as { phases: string[] }) ?? { phases: [] },
    seasonId: (t.season_id as string) ?? null,
  }));
}

export async function getHonorBoard(): Promise<
  { player: string; achievement: string; season: string | null }[]
> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from('honor_board')
    .select('achievement, players(full_name), seasons(name)')
    .order('created_at', { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((h: any) => ({
    player: h.players?.full_name ?? '—',
    achievement: h.achievement,
    season: h.seasons?.name ?? null,
  }));
}
