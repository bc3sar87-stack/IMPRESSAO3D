'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { maskCPF } from '@/lib/masks';

export default function CadastroPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [enviado, setEnviado] = useState(false);
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
      const res = await fetch('/api/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, cpf, senha }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Não foi possível concluir o cadastro.');
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
        <p className="subtitle">Criar novo usuário</p>

        {enviado ? (
          <>
            <div className="success-msg">
              Cadastro enviado! Seu acesso está pendente de aprovação de um administrador. Você
              receberá acesso assim que for liberado.
            </div>
            <Link href="/">Voltar para o login</Link>
          </>
        ) : (
          <>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="nome">Nome</label>
                <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="cpf">CPF</label>
                <input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(maskCPF(e.target.value))}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="senha">Senha</label>
                <input
                  id="senha"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="confirmar">Confirmar senha</label>
                <input
                  id="confirmar"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  required
                />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Criar usuário'}
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
