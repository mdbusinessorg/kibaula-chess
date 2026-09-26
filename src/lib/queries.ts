'use client';

import { supabase } from './client';
import type {
  ClassUnit, Course, Player, RankingMethod, Season, Tournament,
} from './types';

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
    tournaments: (r) => r.wins,
  };
  return [...rows]
    .sort((a, b) => key[method](b) - key[method](a))
    .map((r, i) => ({
      id: r.course_id, name: r.name, slug: r.slug, abbreviation: r.abbreviation,
      icon: r.icon, shortDescription: null, educationType: '',
      players: r.players, avgRating: r.avg_rating, wins: r.wins,
      games: r.games, collectiveScore: r.collective_score, rank: i + 1,
    }));
}

export async function getRankingMethod(): Promise<RankingMethod> {
  const { data } = await supabase.from('ranking_config').select('method').eq('id', 1).single();
  return (data?.method as RankingMethod) ?? 'avg_rating';
}

export async function getCourses(): Promise<Course[]> {
  const method = await getRankingMethod();
  const { data } = await supabase.from('course_stats').select('*');
  return rankCourses((data ?? []) as CourseRow[], method);
}

export async function getClasses(): Promise<ClassUnit[]> {
  const { data } = await supabase.from('class_stats').select('*');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.class_id, name: r.class_name, gradeLabel: r.grade_label ?? null,
    courseId: r.course_id, courseName: r.course_name, courseAbbr: r.abbreviation,
    players: r.players, avgRating: r.avg_rating, wins: r.wins, games: r.games,
  }));
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

const PLAYER_SELECT =
  '*, courses(name, abbreviation), classes(name, grade_label), academic_years(label)';

export async function getPlayers(filter?: {
  courseId?: string; classId?: string;
}): Promise<Player[]> {
  let q = supabase.from('players').select(PLAYER_SELECT)
    .order('rating', { ascending: false });
  if (filter?.courseId) q = q.eq('course_id', filter.courseId);
  if (filter?.classId) q = q.eq('class_id', filter.classId);
  const { data } = await q;
  return (data ?? []).map(mapPlayer);
}

export async function getPlayer(username: string): Promise<Player | null> {
  const { data } = await supabase.from('players').select(PLAYER_SELECT)
    .eq('username', username).single();
  return data ? mapPlayer(data) : null;
}

export async function getSeasons(): Promise<Season[]> {
  const { data } = await supabase.from('seasons').select('*')
    .order('starts_on', { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((s: any) => ({
    id: s.id, name: s.name, startsOn: s.starts_on ?? null,
    endsOn: s.ends_on ?? null, active: s.active,
  }));
}

export async function getTournaments(): Promise<Tournament[]> {
  const { data } = await supabase.from('tournaments').select('*')
    .order('created_at', { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((t: any) => ({
    id: t.id, kind: t.kind, name: t.name, status: t.status,
    format: t.format ?? { phases: [] }, seasonId: t.season_id ?? null,
  }));
}

export async function getHonorBoard(): Promise<
  { player: string; achievement: string; season: string | null }[]
> {
  const { data } = await supabase.from('honor_board')
    .select('achievement, players(full_name), seasons(name)')
    .order('created_at', { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((h: any) => ({
    player: h.players?.full_name ?? '—',
    achievement: h.achievement, season: h.seasons?.name ?? null,
  }));
}

// ---- escrita (onboarding + admin) ----

export async function registerPlayer(p: {
  fullName: string; username: string; email: string;
  courseId: string; classId: string | null; gradeLabel: string | null;
}) {
  let classId = p.classId;
  if (!classId && p.gradeLabel) {
    const { data: year } = await supabase.from('academic_years')
      .select('id').eq('active', true).limit(1).single();
    if (year) {
      const { data: cls } = await supabase.from('classes').insert({
        course_id: p.courseId, academic_year_id: year.id,
        name: p.gradeLabel, grade_label: p.gradeLabel,
      }).select('id').single();
      classId = cls?.id ?? null;
    }
  }
  const { error } = await supabase.from('players').insert({
    full_name: p.fullName, username: p.username, email: p.email || null,
    course_id: p.courseId, class_id: classId,
  });
  if (error) throw new Error(error.message);
}

export async function adminAction(action: string, p: Record<string, unknown>) {
  switch (action) {
    case 'createCourse': {
      const { data: et } = await supabase.from('education_types')
        .select('id').eq('slug', p.educationType).single();
      if (!et) throw new Error('Tipo de ensino inválido');
      const { error } = await supabase.from('courses').insert({
        education_type_id: et.id, name: p.name, slug: p.slug,
        abbreviation: p.abbreviation, icon: p.icon || null,
        short_description: p.shortDescription || null,
      });
      if (error) throw new Error(error.message);
      return;
    }
    case 'archiveCourse':
      await supabase.from('courses').update({ archived: !!p.archived }).eq('id', p.courseId);
      return;
    case 'createClass': {
      const { data: year } = await supabase.from('academic_years')
        .select('id').eq('active', true).limit(1).single();
      const { error } = await supabase.from('classes').insert({
        course_id: p.courseId, academic_year_id: year!.id,
        name: p.name, grade_label: p.gradeLabel || null,
      });
      if (error) throw new Error(error.message);
      return;
    }
    case 'createAcademicYear': {
      const { data: inst } = await supabase.from('institutions')
        .select('id').eq('slug', 'inp').single();
      const { error } = await supabase.from('academic_years').insert({
        institution_id: inst!.id, label: p.label, active: true,
      });
      if (error) throw new Error(error.message);
      return;
    }
    case 'assignStudent':
      await supabase.from('players').update({
        course_id: p.courseId ?? null, class_id: p.classId ?? null,
      }).eq('id', p.playerId);
      return;
    case 'verifyStudent':
      await supabase.from('players')
        .update({ inp_verified: !!p.verified }).eq('id', p.playerId);
      return;
    case 'setRankingMethod':
      await supabase.from('ranking_config').update({ method: p.method }).eq('id', 1);
      return;
    case 'createSeason': {
      const { error } = await supabase.from('seasons').insert({
        name: p.name, starts_on: p.startsOn || null,
        ends_on: p.endsOn || null, active: p.active ?? false,
      });
      if (error) throw new Error(error.message);
      return;
    }
    case 'createTournament': {
      const { error } = await supabase.from('tournaments').insert({
        kind: p.kind, name: p.name, season_id: p.seasonId || null,
        format: { phases: ['groups', 'r16', 'quarters', 'semis', 'final'] },
      });
      if (error) throw new Error(error.message);
      return;
    }
    case 'importStudents':
      return importStudents(String(p.csv));
    default:
      throw new Error('ação desconhecida');
  }
}

export async function importStudents(csv: string) {
  const rows = csv.split(/\r?\n/).filter(Boolean);
  const results: { row: string; ok: boolean; error?: string }[] = [];
  for (const row of rows) {
    const [full_name, username, email, courseSlug, , className, , status] =
      row.split(',').map((s) => s.trim());
    if (!full_name || !username || !courseSlug) {
      results.push({ row, ok: false, error: 'campos obrigatórios em falta' });
      continue;
    }
    const { data: course } = await supabase.from('courses')
      .select('id').eq('slug', courseSlug).single();
    if (!course) {
      results.push({ row, ok: false, error: `curso '${courseSlug}' não existe` });
      continue;
    }
    let classId = null;
    if (className) {
      const { data: cls } = await supabase.from('classes')
        .select('id').eq('course_id', course.id).eq('name', className).single();
      classId = cls?.id ?? null;
      if (!classId) {
        results.push({ row, ok: false, error: `turma '${className}' não existe` });
        continue;
      }
    }
    const { error } = await supabase.from('players').upsert({
      full_name, username, email: email || null,
      course_id: course.id, class_id: classId, status: status || 'Estudante',
    }, { onConflict: 'username' });
    results.push({ row: username, ok: !error, error: error?.message });
  }
  return results;
}
