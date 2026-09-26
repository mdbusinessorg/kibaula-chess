'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from '@/lib/auth';

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

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="panel p-6">
        <h1 className="mb-1 text-2xl font-bold text-center">♞ Kibaúla Chess</h1>
        <p className="mb-6 text-center text-sm muted">
          Plataforma conceptual de xadrez da comunidade INP. Entra ou cria a tua conta.
        </p>
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg border border-[var(--border)] p-1 text-sm">
          {(['entrar', 'criar'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`rounded-md py-1.5 ${mode === m ? 'bg-[var(--accent)] text-black font-semibold' : 'muted'}`}>
              {m === 'entrar' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === 'criar' && (
            <>
              <input className="input" placeholder="Nome completo" value={fullName}
                onChange={(e) => setFullName(e.target.value)} required />
              <input className="input" placeholder="Username" value={username}
                onChange={(e) => setUsername(e.target.value)} required />
            </>
          )}
          <input className="input" type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password (mín. 6)" value={password}
            onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button className="btn w-full" disabled={busy}>
            {busy ? '…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  );
}
