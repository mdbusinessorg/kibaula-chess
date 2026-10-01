'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from '@/lib/auth';
import { createGuest } from '@/lib/offline';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      if (mode === 'entrar') {
        await signIn(email.trim(), password);
        router.replace('/');
      } else {
        if (!fullName.trim() || !username.trim()) throw new Error('Preenche nome completo e username.');
        await signUp({ email: email.trim(), password, fullName: fullName.trim(), username: username.trim() });
        router.replace('/onboarding');
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erro inesperado');
    } finally {
      setBusy(false);
    }
  }

  function guest() {
    createGuest();
    router.replace('/');
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="panel p-6">
        <h1 className="mb-1 text-2xl font-bold text-center">♞ INP <span className="accent">CHESS</span></h1>
        <p className="mb-6 text-center text-sm muted">
          Joga, treina e aprende xadrez com a comunidade INP.
        </p>
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg border border-[var(--border)] p-1 text-sm">
          {(['entrar', 'criar'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`rounded-md py-1.5 ${mode === m ? 'bg-[var(--accent)] text-white font-semibold' : 'muted'}`}>
              {m === 'entrar' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === 'criar' && (
            <>
              <input className="input w-full" placeholder="Nome completo" value={fullName}
                onChange={(e) => setFullName(e.target.value)} required />
              <input className="input w-full" placeholder="Username" value={username}
                onChange={(e) => setUsername(e.target.value)} required />
            </>
          )}
          <input className="input w-full" type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
          <input className="input w-full" type="password" placeholder="Password (mín. 6)" value={password}
            onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button className="btn w-full" disabled={busy}>
            {busy ? '…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        {mode === 'entrar' && (
          <p className="mt-3 text-center text-sm">
            <Link href="/recuperar" className="accent">Esqueceste a password?</Link>
          </p>
        )}

        <div className="mt-5 border-t border-[var(--border)] pt-4 text-center">
          <button className="btn-ghost w-full text-sm" onClick={guest}>
            Continuar como visitante (offline)
          </button>
          <p className="mt-2 text-xs muted">
            No modo visitante podes jogar contra bots, fazer puzzles e estudar cursos sem conta.
          </p>
        </div>
      </div>
    </div>
  );
}
