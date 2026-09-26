'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSession, onAuthChange, getMyPlayer, signOut } from '@/lib/auth';
import type { Player } from '@/lib/types';

const NAV = [
  ['Jogar', '/jogar'],
  ['Ranking', '/ranking'],
  ['Batalha dos Cursos', '/batalha'],
  ['Temporadas', '/temporadas'],
  ['Torneios', '/torneios'],
  ['Academy', '/academy'],
  ['Comunidade', '/comunidade'],
  ['Honor Board', '/honor-board'],
  ['Insights', '/insights'],
  ['Admin', '/admin'],
] as const;

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const s = await getSession();
      if (!s) { if (!cancelled) { setAuthed(false); setPlayer(null); } return; }
      const p = await getMyPlayer(s.userId);
      if (!cancelled) { setAuthed(true); setPlayer(p); }
    }
    load();
    const unsub = onAuthChange((s) => {
      if (cancelled) return;
      if (s) load(); else { setAuthed(false); setPlayer(null); }
    });
    return () => { cancelled = true; unsub(); };
  }, [pathname]);

  if (pathname === '/login') return null;

  return (
    <header className="border-b border-[var(--border)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          ♞ Kibaúla <span className="accent">Chess</span>
        </Link>
        <nav className="flex flex-wrap gap-3 text-sm muted">
          {NAV.map(([label, href]) => (
            <Link key={href} href={href} className="hover:text-white">
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {authed && player && (
            <Link href="/perfil" className="muted hover:text-white">
              {player.username}{player.inpVerified ? ' ✓' : ''}
            </Link>
          )}
          {authed ? (
            <button
              className="muted hover:text-white"
              onClick={async () => { await signOut(); router.replace('/login'); }}
            >
              Sair
            </button>
          ) : (
            <Link href="/login" className="btn text-sm">Entrar</Link>
          )}
        </div>
      </div>
    </header>
  );
}
