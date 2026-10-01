'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updatePassword } from '@/lib/auth';

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setErr('As passwords não coincidem.'); return; }
    setBusy(true); setErr(null);
    try {
      await updatePassword(password);
      router.replace('/');
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erro inesperado — pede um novo link.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="panel p-6">
        <h1 className="mb-1 text-xl font-bold text-center">Nova password</h1>
        <p className="mb-4 text-center text-sm muted">
          Escolhe a tua nova password (mín. 6 caracteres).
        </p>
        <form onSubmit={submit} className="space-y-3">
          <input className="input w-full" type="password" placeholder="Nova password" value={password}
            onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          <input className="input w-full" type="password" placeholder="Confirmar password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} minLength={6} required />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button className="btn w-full" disabled={busy}>
            {busy ? '…' : 'Guardar nova password'}
          </button>
          <p className="text-center text-sm">
            <Link href="/login" className="muted">← Voltar ao login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
