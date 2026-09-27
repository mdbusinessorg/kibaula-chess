import type { Metadata, Viewport } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';
import AuthGate from '@/components/AuthGate';
import { OfflineIndicator, ToastHost } from '@/components/ui';
import ServiceWorker from '@/components/ServiceWorker';
import SyncManager from '@/components/SyncManager';

export const metadata: Metadata = {
  title: 'INP CHESS',
  description:
    'INP CHESS — plataforma de xadrez da comunidade INP: joga, treina, aprende e compete.',
};

export const viewport: Viewport = {
  themeColor: '#12081f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <NavBar />
        <OfflineIndicator />
        <main className="mx-auto max-w-6xl px-4 py-6">
          <AuthGate>{children}</AuthGate>
        </main>
        <ToastHost />
        <ServiceWorker />
        <SyncManager />
        <footer className="border-t border-[var(--border)] py-6 text-center text-xs muted">
          INP CHESS — plataforma conceptual desenvolvida para a comunidade
          académica do Instituto Nacional de Petróleos. Projeto conceptual; não é
          uma aplicação oficial do INP.
        </footer>
      </body>
    </html>
  );
}
