'use client';

import { useEffect, useState, FormEvent } from 'react';

export default function CustoBaseFilamentoPage() {
  const [valor, setValor] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/custo-base-filamento')
      .then((r) => r.json())
      .then((data) => setValor(data.valor !== null ? Number(data.valor).toFixed(2) : ''));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch('/api/custo-base-filamento', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor: Number(valor).toFixed(2) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Não foi possível salvar.');
        return;
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Custo Base de Filamento</h2>
      </div>

      <div className="card">
        {error && <div className="error-msg">{error}</div>}
        {saved && <div className="success-msg">Valor salvo com sucesso.</div>}

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ maxWidth: 240 }}>
            <label>Custo por grama (R$)</label>
            <div className="input-prefix-group">
              <span className="input-prefix">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />
            </div>
            <p className="hint">Valor específico da empresa selecionada no momento.</p>
          </div>
          <button className="btn-primary" type="submit" disabled={saving} style={{ width: 'auto', padding: '10px 24px', marginTop: 16 }}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>
    </div>
  );
}
