'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CourseCard } from '@/components/CourseCard';
import { completeOnboarding } from '@/lib/queries';
import { getSession } from '@/lib/auth';
import type { ClassUnit, Course } from '@/lib/types';

export default function OnboardingForm({
  courses,
  classes,
}: {
  courses: Course[];
  classes: ClassUnit[];
}) {
  const router = useRouter();
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [classId, setClassId] = useState('');
  const [grade, setGrade] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSession().then((s) => {
      if (!s) router.replace('/login');
      else setAuthUserId(s.userId);
    });
  }, [router]);

  const courseClasses = useMemo(
    () => classes.filter((c) => c.courseId === courseId),
    [classes, courseId],
  );

  async function submit() {
    if (!authUserId) return;
    setError(null);
    setBusy(true);
    try {
      await completeOnboarding({
        authUserId, courseId: courseId!,
        classId: classId || null, gradeLabel: grade || null,
      });
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao registar.');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {courses.map((c) => (
          <CourseCard
            key={c.id}
            course={c}
            selected={courseId === c.id}
            onSelect={() => setCourseId(c.id)}
          />
        ))}
      </div>

      <div className="panel space-y-3 p-5">
        <h2 className="font-semibold">A tua turma</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input placeholder="Classe (ex.: 13ª)" value={grade}
            onChange={(e) => setGrade(e.target.value)} />
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Turma (ex.: EM13-A)</option>
            {courseClasses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          className="btn"
          disabled={busy || !courseId || !authUserId}
          onClick={submit}
        >
          {busy ? 'A registar…' : 'Concluir registo'}
        </button>
      </div>
    </div>
  );
}
