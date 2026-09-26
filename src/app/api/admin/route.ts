import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// Gestão académica — em produção proteger por auth de admin.
export async function POST(req: Request) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  const { action, ...p } = await req.json();

  try {
    switch (action) {
      case 'createCourse': {
        const { data: et } = await sb.from('education_types')
          .select('id').eq('slug', p.educationType).single();
        if (!et) throw new Error('Tipo de ensino inválido');
        const { error } = await sb.from('courses').insert({
          education_type_id: et.id, name: p.name, slug: p.slug,
          abbreviation: p.abbreviation, icon: p.icon || null,
          short_description: p.shortDescription || null,
        });
        if (error) throw error;
        break;
      }
      case 'archiveCourse':
        await sb.from('courses').update({ archived: !!p.archived }).eq('id', p.courseId);
        break;
      case 'createClass': {
        const { data: year } = await sb.from('academic_years')
          .select('id').eq('active', true).limit(1).single();
        const { error } = await sb.from('classes').insert({
          course_id: p.courseId, academic_year_id: year!.id,
          name: p.name, grade_label: p.gradeLabel || null,
        });
        if (error) throw error;
        break;
      }
      case 'createAcademicYear': {
        const { data: inst } = await sb.from('institutions')
          .select('id').eq('slug', 'inp').single();
        const { error } = await sb.from('academic_years').insert({
          institution_id: inst!.id, label: p.label, active: p.active ?? true,
        });
        if (error) throw error;
        break;
      }
      case 'assignStudent': {
        const { error } = await sb.from('players').update({
          course_id: p.courseId ?? null, class_id: p.classId ?? null,
        }).eq('id', p.playerId);
        if (error) throw error;
        break;
      }
      case 'verifyStudent': {
        const { error } = await sb.from('players')
          .update({ inp_verified: !!p.verified }).eq('id', p.playerId);
        if (error) throw error;
        break;
      }
      case 'setRankingMethod':
        await sb.from('ranking_config').update({ method: p.method }).eq('id', 1);
        break;
      case 'createSeason': {
        const { error } = await sb.from('seasons').insert({
          name: p.name, starts_on: p.startsOn || null,
          ends_on: p.endsOn || null, active: p.active ?? false,
        });
        if (error) throw error;
        break;
      }
      case 'createTournament': {
        const { error } = await sb.from('tournaments').insert({
          kind: p.kind, name: p.name,
          season_id: p.seasonId || null,
          format: p.format ?? { phases: ['groups', 'r16', 'quarters', 'semis', 'final'] },
        });
        if (error) throw error;
        break;
      }
      case 'importStudents': {
        // CSV: Nome,Username,Email,Curso(slug),Classe,Turma,Ano Lectivo,Status
        const rows = String(p.csv).split(/\r?\n/).filter(Boolean);
        const results: { row: string; ok: boolean; error?: string }[] = [];
        for (const row of rows) {
          const [full_name, username, email, courseSlug, , className, , status] =
            row.split(',').map((s: string) => s.trim());
          if (!full_name || !username || !courseSlug) {
            results.push({ row, ok: false, error: 'campos obrigatórios em falta' });
            continue;
          }
          const { data: course } = await sb.from('courses')
            .select('id').eq('slug', courseSlug).single();
          if (!course) {
            results.push({ row, ok: false, error: `curso '${courseSlug}' não existe` });
            continue;
          }
          let classId = null;
          if (className) {
            const { data: cls } = await sb.from('classes')
              .select('id').eq('course_id', course.id).eq('name', className).single();
            classId = cls?.id ?? null;
            if (!classId) {
              results.push({ row, ok: false, error: `turma '${className}' não existe` });
              continue;
            }
          }
          const { error } = await sb.from('players').upsert({
            full_name, username, email: email || null,
            course_id: course.id, class_id: classId,
            status: status || 'Estudante',
          }, { onConflict: 'username' });
          results.push({ row: username, ok: !error, error: error?.message });
        }
        return NextResponse.json({ results });
      }
      default:
        return NextResponse.json({ error: 'ação desconhecida' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'erro' }, { status: 400 });
  }
}
