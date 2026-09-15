'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Empresa {
  codigo: number;
  razao_social: string;
  cnpj: string;
}

export default function SelecionarEmpresaPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loadingCodigo, setLoadingCodigo] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/minhas-empresas')
      .then((r) => r.json())
      .then(setEmpresas);
  }, []);

  async function selecionar(empresa: Empresa) {
    setError('');
    setLoadingCodigo(empresa.codigo);
    try {
      const res = await fetch('/api/selecionar-empresa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa_codigo: empresa.codigo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Não foi possível selecionar essa empresa.');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } finally {
      setLoadingCodigo(null);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card" style={{ maxWidth: 420 }}>
        <h1>Selecione a empresa</h1>
        <p className="subtitle">Escolha com qual empresa você quer trabalhar agora.</p>

        {error && <div className="error-msg">{error}</div>}

        <div className="checklist">
          {empresas.map((emp) => (
            <button
              key={emp.codigo}
              type="button"
              className="btn-secondary"
              style={{ textAlign: 'left', width: '100%' }}
              disabled={loadingCodigo !== null}
              onClick={() => selecionar(emp)}
            >
              {loadingCodigo === emp.codigo ? 'Entrando...' : emp.razao_social}
            </button>
          ))}
          {empresas.length === 0 && (
            <p style={{ color: '#64748b' }}>Nenhuma empresa vinculada ao seu usuário.</p>
          )}
        </div>
      </div>
    </div>
  );
}
