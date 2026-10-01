'use client';

import { supabase } from './client';
import type { Player } from './types';

export type Session = {
  userId: string;
  email: string | null;
};

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  const u = data.session?.user;
  return u ? { userId: u.id, email: u.email ?? null } : null;
}

export function onAuthChange(cb: (s: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_e, s) => {
    cb(s?.user ? { userId: s.user.id, email: s.user.email ?? null } : null);
  });
  return () => data.subscription.unsubscribe();
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(
    error.message.includes('Invalid login') ? 'Email ou password incorrectos' : error.message,
  );
}

export async function signUp(p: {
  email: string; password: string; fullName: string; username: string;
}) {
  const { error } = await supabase.auth.signUp({
    email: p.email,
    password: p.password,
    options: { data: { full_name: p.fullName, username: p.username } },
  });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  await supabase.auth.signOut();
}

/** Recuperação: envia email com token/link para redefinir a password. */
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/redefinir-senha` : undefined,
  });
  if (error) throw new Error(error.message);
}

/** Nova password depois de seguir o link de recuperação. */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
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
    xp: r.xp ?? 0,
    level: r.level ?? 1,
    streakDays: r.streak_days ?? 0,
    ratingBlitz: r.rating_blitz ?? r.rating,
    ratingRapid: r.rating_rapid ?? r.rating,
    ratingClassical: r.rating_classical ?? r.rating,
    ratingPuzzle: r.rating_puzzle ?? 1200,
    avatarUrl: r.avatar_url ?? null,
  };
}

/** Registo académico ligado à conta autenticada (null = ainda não fez onboarding). */
export async function getMyPlayer(userId: string): Promise<Player | null> {
  const { data } = await supabase.from('players')
    .select('*, courses(name, abbreviation), classes(name, grade_label), academic_years(label)')
    .eq('auth_user_id', userId)
    .maybeSingle();
  if (!data) return null;
  const p = mapPlayer(data);
  return p.courseId ? p : null; // sem curso = onboarding pendente
}
