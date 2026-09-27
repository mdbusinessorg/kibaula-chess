import { notFound } from 'next/navigation';
import { ACADEMY, getCourse } from '@/lib/academy';
import CoursePage from './CoursePage';

export function generateStaticParams() {
  return ACADEMY.map((c) => ({ course: c.slug }));
}

export default async function Page({ params }: { params: Promise<{ course: string }> }) {
  const { course } = await params;
  const c = getCourse(course);
  if (!c) notFound();
  return <CoursePage course={c} />;
}
