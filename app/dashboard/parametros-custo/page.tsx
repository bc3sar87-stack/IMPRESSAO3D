'use client';

import { useEffect, useState, FormEvent } from 'react';

function parseDecimal(value: string): number {
  return Number(String(value).trim().replace(',', '.'));
}

export default function ParametrosCustoPage() {
  const [valorConsumoHora, setValorConsumoHora] = useState('');
  const [custoBaseFilamento, setCustoBaseFilamento] = useState('');
  const [custoMaoObraHora, setCustoMaoObraHora] = useState('');
  const [markupPadrao, setMarkupPadrao] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/valor-consumo-hora').then((r) => r.json()),
      fetch('/api/custo-base-filamento').then((r) => r.json()),
      fetch('/api/custo-mao-obra-hora').then((r) => r.json()),
      fetch('/api/markup-padrao').then((r) => r.json()),
    ]).then(([consumo, filamento, maoObra, markup]) => {
      setValorConsumoHora(consumo.valor_hora !== null ? Number(consumo.valor_hora).toFixed(2) : '');
      setCustoBaseFilamento(filamento.valor !== null ? Number(filamento.valor).toFixed(2) : '');
      setCustoMaoObraHora(maoObra.valor_hora !== null ? Number(maoObra.valor_hora).toFixed(2) : '');
      setMarkupPadrao(markup.valor_percentual !== null ? Number(markup.valor_percentual).toFixed(2) : '');
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);

    const valores = {
      valorConsumoHora: parseDecimal(valorConsumoHora),
      custoBaseFilamento: parseDecimal(custoBaseFilamento),
      custoMaoObraHora: parseDecimal(custoMaoObraHora),
      markupPadrao: parseDecimal(markupPadrao),
    };
    if (Object.values(valores).some((v) => Number.isNaN(v))) {
      setError('Informe valores numéricos válidos (use ponto ou vírgula para decimais).');
      return;
    }

    setSaving(true);
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        fetch('/api/valor-consumo-hora', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valor_hora: valores.valorConsumoHora.toFixed(2) }),
        }),
        fetch('/api/custo-base-filamento', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valor: valores.custoBaseFilamento.toFixed(2) }),
        }),
        fetch('/api/custo-mao-obra-hora', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valor_hora: valores.custoMaoObraHora.toFixed(2) }),
        }),
        fetch('/api/markup-padrao', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valor_percentual: valores.markupPadrao.toFixed(2) }),
        }),
      ]);
      if (!r1.ok || !r2.ok || !r3.ok || !r4.ok) {
        setError('Não foi possível salvar um ou mais valores.');
        return;
      }
      setValorConsumoHora(valores.valorConsumoHora.toFixed(2));
      setCustoBaseFilamento(valores.custoBaseFilamento.toFixed(2));
      setCustoMaoObraHora(valores.custoMaoObraHora.toFixed(2));
      setMarkupPadrao(valores.markupPadrao.toFixed(2));
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Parâmetros de Custo</h2>
      </div>

      <div className="card">
        {error && <div className="error-msg">{error}</div>}
        {saved && <div className="success-msg">Valores salvos com sucesso.</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Valor Consumo Hora (R$)</label>
              <div className="input-prefix-group">
                <span className="input-prefix">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valorConsumoHora}
                  onChange={(e) => setValorConsumoHora(e.target.value)}
                  required
                />
              </div>
              <p className="hint">Custo de energia por hora de impressão.</p>
            </div>
            <div className="field">
              <label>Custo Base de Filamento (R$/Kg)</label>
              <div className="input-prefix-group">
                <span className="input-prefix">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={custoBaseFilamento}
                  onChange={(e) => setCustoBaseFilamento(e.target.value)}
                  required
                />
              </div>
              <p className="hint">Valor de compra por quilo, convertido para gramas no cálculo do produto.</p>
            </div>
            <div className="field">
              <label>Valor Custo Mão de Obra (Hora)</label>
              <div className="input-prefix-group">
                <span className="input-prefix">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={custoMaoObraHora}
                  onChange={(e) => setCustoMaoObraHora(e.target.value)}
                  required
                />
              </div>
              <p className="hint">Custo da hora de mão de obra usada nos produtos.</p>
            </div>
            <div className="field">
              <label>Markup Padrão (%)</label>
              <input
                type="text"
                inputMode="decimal"
                value={markupPadrao}
                onChange={(e) => setMarkupPadrao(e.target.value)}
                required
              />
              <p className="hint">Sugerido automaticamente no campo Markup ao criar um novo orçamento.</p>
            </div>
          </div>

          <p className="hint" style={{ marginTop: 16 }}>
            Valores específicos da empresa selecionada no momento.
          </p>

          <button
            className="btn-primary"
            type="submit"
            disabled={saving}
            style={{ width: 'auto', padding: '10px 24px', marginTop: 8 }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>
    </div>
  );
}
