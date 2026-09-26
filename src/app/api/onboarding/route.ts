import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: Request) {
  const sb = getSupabase();
  if (!sb) {
    return NextResponse.json(
      { error: 'Base de dados não configurada (Supabase).' },
      { status: 503 },
    );
  }
  const { fullName, username, email, courseId, classId, gradeLabel } =
    await req.json();
  if (!fullName || !username || !courseId) {
    return NextResponse.json({ error: 'Nome, username e curso são obrigatórios.' }, { status: 400 });
  }
  let finalClassId = classId;
  if (!finalClassId && gradeLabel) {
    const { data: year } = await sb
      .from('academic_years').select('id').eq('active', true).limit(1).single();
    if (year) {
      const { data: cls } = await sb
        .from('classes')
        .insert({ course_id: courseId, academic_year_id: year.id, name: gradeLabel, grade_label: gradeLabel })
        .select('id').single();
      finalClassId = cls?.id ?? null;
    }
  }
  const { error } = await sb.from('players').insert({
    full_name: fullName, username, email: email || null,
    course_id: courseId, class_id: finalClassId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
