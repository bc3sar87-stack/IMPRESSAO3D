'use client';

import { useEffect, useState, FormEvent } from 'react';

export default function ValorConsumoHoraPage() {
  const [valorHora, setValorHora] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/valor-consumo-hora')
      .then((r) => r.json())
      .then((data) => setValorHora(data.valor_hora ?? ''));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch('/api/valor-consumo-hora', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor_hora: valorHora }),
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
        <h2>Valor Consumo Hora</h2>
      </div>

      <div className="card">
        {error && <div className="error-msg">{error}</div>}
        {saved && <div className="success-msg">Valor salvo com sucesso.</div>}

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ maxWidth: 240 }}>
            <label>Valor por hora (R$)</label>
            <div className="input-prefix-group">
              <span className="input-prefix">R$</span>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={valorHora}
                onChange={(e) => setValorHora(e.target.value)}
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
