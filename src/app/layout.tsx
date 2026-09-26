import type { Metadata } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';
import AuthGate from '@/components/AuthGate';

export const metadata: Metadata = {
  title: 'Kibaúla Chess',
  description:
    'Plataforma conceptual de xadrez desenvolvida para a comunidade académica do INP.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <NavBar />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <AuthGate>{children}</AuthGate>
        </main>
        <footer className="border-t border-[var(--border)] py-6 text-center text-xs muted">
          Kibaúla Chess — plataforma conceptual desenvolvida para a comunidade
          académica do Instituto Nacional de Petróleos. Projeto conceptual; não é
          uma aplicação oficial do INP.
        </footer>
      </body>
    </html>
  );
}
