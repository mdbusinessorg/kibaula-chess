'use client';

import { useMemo, useState } from 'react';
import { CourseCard } from '@/components/CourseCard';
import { registerPlayer } from '@/lib/queries';
import type { ClassUnit, Course } from '@/lib/types';

export default function OnboardingForm({
  courses,
  classes,
}: {
  courses: Course[];
  classes: ClassUnit[];
}) {
  const [courseId, setCourseId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [classId, setClassId] = useState('');
  const [grade, setGrade] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const courseClasses = useMemo(
    () => classes.filter((c) => c.courseId === courseId),
    [classes, courseId],
  );

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await registerPlayer({
        fullName, username, email, courseId: courseId!,
        classId: classId || null, gradeLabel: grade || null,
      });
      setDone(username);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao registar.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="panel p-6">
        <h2 className="text-lg font-semibold">Bem-vindo ao Kibaúla, {done} ♞</h2>
        <p className="mt-2 text-sm muted">
          O teu curso faz agora parte do teu perfil. Um administrador pode
          verificar a tua turma para receberes o badge ✓ INP Verified.
        </p>
      </div>
    );
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
        <h2 className="font-semibold">Os teus dados</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input placeholder="Nome completo" value={fullName}
            onChange={(e) => setFullName(e.target.value)} />
          <input placeholder="Username" value={username}
            onChange={(e) => setUsername(e.target.value)} />
          <input placeholder="Email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} />
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
          disabled={busy || !courseId || !fullName || !username}
          onClick={submit}
        >
          {busy ? 'A registar…' : 'Criar perfil'}
        </button>
      </div>
    </div>
  );
}
