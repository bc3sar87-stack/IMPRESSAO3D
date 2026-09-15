'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/esqueci-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Não foi possível concluir a solicitação.');
        return;
      }
      setEnviado(true);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <img src="/logo-full.svg" alt="3D Print Control" height={34} />
        </div>
        <p className="subtitle">Recuperar acesso à sua conta</p>

        {enviado ? (
          <>
            <div className="success-msg">
              Se esse e-mail estiver cadastrado, você vai receber um link para redefinir a senha.
            </div>
            <Link href="/">Voltar para o login</Link>
          </>
        ) : (
          <>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link de redefinição'}
              </button>
            </form>
            <p className="hint" style={{ marginTop: 16 }}>
              <Link href="/">Voltar para o login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
