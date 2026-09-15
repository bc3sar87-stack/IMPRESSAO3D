'use client';

import { Suspense, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function DefinirSenhaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (senha !== confirmar) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/definir-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, senha }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Não foi possível definir a senha.');
        return;
      }
      router.push(data.redirect || '/dashboard');
      router.refresh();
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <h1>Link inválido</h1>
          <p className="subtitle">O link para definir a senha está incompleto ou inválido.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Defina sua senha</h1>
        <p className="subtitle">Escolha a senha que você vai usar para acessar o sistema.</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="senha">Nova senha</label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="confirmar">Confirmar senha</label>
            <input
              id="confirmar"
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Definir senha e entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function DefinirSenhaPage() {
  return (
    <Suspense>
      <DefinirSenhaForm />
    </Suspense>
  );
}
