'use client';

import { useState } from 'react';
import Link from 'next/link';
import { requestPasswordReset } from '@/lib/auth';

export default function RecuperarPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await requestPasswordReset(email.trim());
      setDone(true);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erro inesperado');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="panel p-6">
        <h1 className="mb-1 text-xl font-bold text-center">Recuperar password</h1>
        {done ? (
          <div className="text-center">
            <p className="my-4 text-sm">
              Enviámos um email para <strong>{email}</strong> com o link para
              redefinir a tua password. Verifica também o spam.
            </p>
            <Link href="/login" className="btn w-full">Voltar ao login</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <p className="mb-2 text-sm muted">
              Introduz o email da tua conta para receberes o link de recuperação.
            </p>
            <input className="input w-full" type="email" placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
            {err && <p className="text-sm text-red-400">{err}</p>}
            <button className="btn w-full" disabled={busy}>
              {busy ? 'A enviar…' : 'Enviar link de recuperação'}
            </button>
            <p className="text-center text-sm">
              <Link href="/login" className="muted">← Voltar ao login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
