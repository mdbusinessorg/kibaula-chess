'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSession, onAuthChange, getMyPlayer, signOut } from '@/lib/auth';
import type { Player } from '@/lib/types';

const TABS = [
  ['Início', '/', '🏠'],
  ['Jogar', '/jogar', '♞'],
  ['Treinar', '/treinar', '🎯'],
  ['Puzzles', '/puzzles', '🧩'],
  ['Perfil', '/perfil', '👤'],
] as const;

const MORE = [
  ['Academy', '/academy'],
  ['Ranking', '/ranking'],
  ['Torneios', '/torneios'],
  ['Análise', '/analise'],
  ['Batalha dos Cursos', '/batalha'],
  ['Temporadas', '/temporadas'],
  ['Comunidade', '/comunidade'],
  ['Honor Board', '/honor-board'],
  ['Insights', '/insights'],
  ['Admin', '/admin'],
] as const;

const PUBLIC_PATHS = ['/login', '/recuperar', '/redefinir-senha'];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [authed, setAuthed] = useState(false);
  const [more, setMore] = useState(false);

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

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      <header className="top-bar">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            ♞ INP <span className="accent">CHESS</span>
          </Link>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {authed && player && (
              <Link href="/perfil" className="chip">
                {player.username}{player.inpVerified ? ' ✓' : ''} · {player.rating}
              </Link>
            )}
            {authed ? (
              <button className="muted hover:text-white"
                onClick={async () => { await signOut(); router.replace('/login'); }}>
                Sair
              </button>
            ) : (
              <Link href="/login" className="btn text-sm">Entrar</Link>
            )}
          </div>
        </div>
      </header>

      {more && (
        <div className="fixed inset-0 z-40" onClick={() => setMore(false)}>
          <div className="panel absolute bottom-16 right-2 left-2 mx-auto max-w-md p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            {MORE.map(([label, href]) => (
              <Link key={href} href={href} onClick={() => setMore(false)}
                className="block rounded-lg px-3 py-2.5 text-sm hover:bg-[var(--panel-2)]">
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        {TABS.map(([label, href, icon]) => (
          <Link key={href} href={href}
            className={pathname === href || (href !== '/' && pathname.startsWith(href)) ? 'active' : ''}>
            <span className="nav-icon">{icon}</span>
            {label}
          </Link>
        ))}
        <a href="#" onClick={(e) => { e.preventDefault(); setMore((v) => !v); }}
          className={more ? 'active' : ''}>
          <span className="nav-icon">☰</span>
          Mais
        </a>
      </nav>
    </>
  );
}
