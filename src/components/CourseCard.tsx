import type { Course } from '@/lib/types';

export function CourseCard({
  course,
  selected,
  onSelect,
}: {
  course: Course;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`panel w-full p-4 text-left transition ${
        selected ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{course.icon}</span>
        <span className="font-semibold uppercase tracking-wide">
          {course.abbreviation}
        </span>
      </div>
      <div className="mt-1 text-sm">{course.name}</div>
      {course.shortDescription && (
        <div className="mt-1 text-xs muted">{course.shortDescription}</div>
      )}
      <div className="mt-3 text-xs muted">
        <div>{course.players} jogadores</div>
        <div>Rating médio: {course.avgRating || '—'}</div>
        <div className="accent">#{course.rank ?? '—'} no Ranking Kibaúla</div>
      </div>
    </button>
  );
}
