'use client';

import { useEffect, useState } from 'react';
import { getClasses, getCourses } from '@/lib/queries';
import type { ClassUnit, Course } from '@/lib/types';
import OnboardingForm from './OnboardingForm';

export default function OnboardingPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassUnit[]>([]);
  useEffect(() => {
    getCourses().then(setCourses).catch(() => {});
    getClasses().then(setClasses).catch(() => {});
  }, []);

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
