'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession, onAuthChange, getMyPlayer } from '@/lib/auth';
import { getGuest, isOnline } from '@/lib/offline';
import { touchStreak } from '@/lib/gamification';
import type { Player } from '@/lib/types';

const PUBLIC_PATHS = ['/login', '/recuperar', '/redefinir-senha'];
const isPublic = (p: string) => PUBLIC_PATHS.some((x) => p.startsWith(x));

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'allow'>('loading');
  const [, setPlayer] = useState<Player | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      // caminhos públicos passam sempre
      if (isPublic(pathname)) { setState('allow'); return; }

      const s = await getSession();
      if (cancelled) return;

      if (!s) {
        // sem sessão: offline ou modo visitante → entra como convidado
        if (!isOnline() || getGuest()) { setState('allow'); return; }
        router.replace('/login');
        return;
      }

      const p = await getMyPlayer(s.userId);
      if (cancelled) return;
      setPlayer(p);
      if (p) void touchStreak(p.id); // streak diário
      if (!p && pathname !== '/onboarding') {
        router.replace('/onboarding');
        return;
      }
      setState('allow');
    }
    check();
    const unsub = onAuthChange((s) => {
      if (!s && !isPublic(pathname) && isOnline() && !getGuest()) router.replace('/login');
      if (s && pathname === '/login') router.replace('/');
    });
    return () => { cancelled = true; unsub(); };
  }, [pathname, router]);

  if (isPublic(pathname)) return <>{children}</>;
  if (state === 'loading') {
    return <div className="py-24 text-center muted">A carregar…</div>;
  }
  return <>{children}</>;
}
