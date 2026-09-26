import { getClasses, getCourses } from '@/lib/data';
import OnboardingForm from './OnboardingForm';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const courses = await getCourses();
  const classes = await getClasses();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Qual é o teu curso?</h1>
      <p className="mb-6 mt-1 text-sm muted">
        Escolhe o teu curso, classe e turma. A turma é confirmada por ti e pode ser
        verificada por um administrador (badge ✓ INP Verified).
      </p>
      <OnboardingForm courses={courses} classes={classes} />
    </div>
  );
}
