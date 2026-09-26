'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession, onAuthChange, getMyPlayer } from '@/lib/auth';
import type { Player } from '@/lib/types';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'allow'>('loading');
  const [, setPlayer] = useState<Player | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const s = await getSession();
      if (cancelled) return;
      if (!s) {
        if (pathname !== '/login') router.replace('/login');
        else setState('allow');
        return;
      }
      const p = await getMyPlayer(s.userId);
      if (cancelled) return;
      setPlayer(p);
      if (!p && pathname !== '/onboarding' && pathname !== '/login') {
        router.replace('/onboarding');
        return;
      }
      if (pathname === '/login') { router.replace('/'); return; }
      setState('allow');
    }
    check();
    const unsub = onAuthChange((s) => {
      if (!s && pathname !== '/login') router.replace('/login');
      if (s && pathname === '/login') router.replace('/');
    });
    return () => { cancelled = true; unsub(); };
  }, [pathname, router]);

  if (pathname === '/login') return <>{children}</>;
  if (state === 'loading') {
    return (
      <div className="py-24 text-center muted">A carregar…</div>
    );
  }
  return <>{children}</>;
}
