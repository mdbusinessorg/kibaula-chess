import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kibaúla Chess',
  description:
    'Plataforma conceptual de xadrez desenvolvida para a comunidade académica do INP.',
};

const NAV = [
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
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
            <Link href="/onboarding" className="btn ml-auto text-sm">
              Entrar
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-[var(--border)] py-6 text-center text-xs muted">
          Kibaúla Chess — plataforma conceptual desenvolvida para a comunidade
          académica do Instituto Nacional de Petróleos. Projeto conceptual; não é
          uma aplicação oficial do INP.
        </footer>
      </body>
    </html>
  );
}
