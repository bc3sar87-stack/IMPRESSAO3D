'use client';

import { useEffect, useState, FormEvent } from 'react';
import { IconTrash } from './icons';

export interface LotesAlvo {
  codigo: number;
  tipo_nome: string;
  cor: string;
  unidade_medida_sigla: string;
}

interface Lote {
  codigo: number;
  marca: string | null;
  fornecedor: string | null;
  valor_custo: string | null;
  quantidade_inicial: string | null;
  data_compra: string | null;
  observacao: string | null;
  criado_em: string;
  saldo: string;
  reservado: string;
  temp_mesa_min: number | null;
  temp_mesa_max: number | null;
  temp_impressao_min: number | null;
  temp_impressao_max: number | null;
}

interface Movimentacao {
  codigo: number;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidade: string;
  observacao: string | null;
  criado_em: string;
}

const emptyNovoLote = {
  marca: '',
  fornecedor: '',
  valor_custo: '',
  quantidade_inicial: '',
  data_compra: '',
  observacao: '',
  temp_mesa_min: '',
  temp_mesa_max: '',
  temp_impressao_min: '',
  temp_impressao_max: '',
};
const emptyMovForm = { tipo: 'ENTRADA' as 'ENTRADA' | 'SAIDA', quantidade: '', observacao: '' };

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export default function LotesMateriaPrima({
  alvo,
  onClose,
  onChange,
}: {
  alvo: LotesAlvo | null;
  onClose: () => void;
  onChange?: () => void;
}) {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [error, setError] = useState('');

  const [novoLoteOpen, setNovoLoteOpen] = useState(false);
  const [novoLoteForm, setNovoLoteForm] = useState(emptyNovoLote);
  const [salvandoLote, setSalvandoLote] = useState(false);
  const [marcasSugeridas, setMarcasSugeridas] = useState<string[]>([]);
  const [fornecedoresSugeridos, setFornecedoresSugeridos] = useState<string[]>([]);

  const [loteSelecionado, setLoteSelecionado] = useState<Lote | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [movForm, setMovForm] = useState(emptyMovForm);
  const [salvandoMov, setSalvandoMov] = useState(false);
  const [movError, setMovError] = useState('');

  useEffect(() => {
    if (alvo) {
      carregarLotes(alvo.codigo);
      setNovoLoteOpen(false);
      setNovoLoteForm(emptyNovoLote);
      setError('');
      carregarOpcoes();
    } else {
      setLotes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvo?.codigo]);

  async function carregarLotes(codigo: number) {
    const res = await fetch(`/api/estoque/${codigo}`);
    if (res.ok) setLotes(await res.json());
  }

  async function carregarOpcoes() {
    const res = await fetch('/api/estoque/opcoes-lote');
    if (res.ok) {
      const data = await res.json();
      setMarcasSugeridas(data.marcas || []);
      setFornecedoresSugeridos(data.fornecedores || []);
    }
  }

  async function atualizarTudo() {
    if (!alvo) return;
    await carregarLotes(alvo.codigo);
    onChange?.();
  }

  async function handleCriarLote(e: FormEvent) {
    e.preventDefault();
    if (!alvo) return;
    setError('');
    setSalvandoLote(true);
    try {
      const res = await fetch(`/api/estoque/${alvo.codigo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoLoteForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Não foi possível criar o lote.');
        return;
      }
      setNovoLoteForm(emptyNovoLote);
      setNovoLoteOpen(false);
      await atualizarTudo();
    } finally {
      setSalvandoLote(false);
    }
  }

  async function abrirLote(lote: Lote) {
    setLoteSelecionado(lote);
    setMovForm(emptyMovForm);
    setMovError('');
    const res = await fetch(`/api/estoque/lotes/${lote.codigo}`);
    if (res.ok) setMovimentacoes(await res.json());
  }

  function fecharLote() {
    setLoteSelecionado(null);
    setMovimentacoes([]);
  }

  async function handleMovimentar(e: FormEvent) {
    e.preventDefault();
    if (!loteSelecionado) return;
    setMovError('');
    setSalvandoMov(true);
    try {
      const res = await fetch('/api/estoque/movimentar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lote_codigo: loteSelecionado.codigo,
          tipo: movForm.tipo,
          quantidade: movForm.quantidade,
          observacao: movForm.observacao,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMovError(data.error || 'Não foi possível registrar a movimentação.');
        return;
      }
      setMovForm(emptyMovForm);
      await atualizarTudo();
      const lotesAtualizados = alvo ? await (await fetch(`/api/estoque/${alvo.codigo}`)).json() : [];
      const loteAtual = lotesAtualizados.find((l: Lote) => l.codigo === loteSelecionado.codigo);
      if (loteAtual) setLoteSelecionado(loteAtual);
      const res2 = await fetch(`/api/estoque/lotes/${loteSelecionado.codigo}`);
      if (res2.ok) setMovimentacoes(await res2.json());
    } finally {
      setSalvandoMov(false);
    }
  }

  async function handleDeleteMovimentacao(movCodigo: number) {
    if (!loteSelecionado) return;
    if (!confirm('Deseja realmente excluir esta movimentação?')) return;
    setMovError('');
    const res = await fetch(`/api/estoque/movimentacao/${movCodigo}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMovError(data.error || 'Não foi possível excluir a movimentação.');
      return;
    }
    await atualizarTudo();
    const res2 = await fetch(`/api/estoque/lotes/${loteSelecionado.codigo}`);
    if (res2.ok) setMovimentacoes(await res2.json());
  }

  if (!alvo) return null;

  const saldoTotal = lotes.reduce((s, l) => s + Number(l.saldo), 0);
  const reservadoTotal = lotes.reduce((s, l) => s + Number(l.reservado), 0);

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 1100 }}>
          <div className="modal-header">
            <h3>
              {alvo.tipo_nome} — {alvo.cor}
              <br />
              <small style={{ color: '#64748b', fontWeight: 400 }}>
                Saldo total: {saldoTotal.toFixed(2)} {alvo.unidade_medida_sigla}
                {reservadoTotal > 0 ? ` · Reservado: ${reservadoTotal.toFixed(2)} ${alvo.unidade_medida_sigla}` : ''}
              </small>
            </h3>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
              ×
            </button>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Marca</th>
                  <th>Fornecedor</th>
                  <th>Custo Total</th>
                  <th>Custo/Unidade</th>
                  <th>Data da Compra</th>
                  <th>Saldo Físico</th>
                  <th>Reservado</th>
                  <th>Disponível</th>
                  <th>Temp. Mesa</th>
                  <th>Temp. Impressão</th>
                  <th>Observação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lotes.map((lote) => {
                  const disponivel = Number(lote.saldo) - Number(lote.reservado);
                  const custoUnidade =
                    lote.valor_custo && Number(lote.quantidade_inicial) > 0
                      ? Number(lote.valor_custo) / Number(lote.quantidade_inicial)
                      : null;
                  return (
                    <tr key={lote.codigo}>
                      <td>{lote.marca || '-'}</td>
                      <td>{lote.fornecedor || '-'}</td>
                      <td>{lote.valor_custo ? `R$ ${Number(lote.valor_custo).toFixed(2)}` : '-'}</td>
                      <td>{custoUnidade !== null ? `R$ ${custoUnidade.toFixed(4)}/${alvo.unidade_medida_sigla}` : '-'}</td>
                      <td>
                        {lote.data_compra
                          ? new Date(lote.data_compra).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                          : '-'}
                      </td>
                      <td>
                        {lote.saldo} {alvo.unidade_medida_sigla}
                      </td>
                      <td>{Number(lote.reservado) > 0 ? `${lote.reservado} ${alvo.unidade_medida_sigla}` : '-'}</td>
                      <td style={{ color: disponivel <= 0 ? '#dc2626' : undefined, fontWeight: 600 }}>
                        {disponivel.toFixed(2)} {alvo.unidade_medida_sigla}
                      </td>
                      <td>
                        {lote.temp_mesa_min !== null || lote.temp_mesa_max !== null
                          ? `${lote.temp_mesa_min ?? '?'}–${lote.temp_mesa_max ?? '?'} °C`
                          : '-'}
                      </td>
                      <td>
                        {lote.temp_impressao_min !== null || lote.temp_impressao_max !== null
                          ? `${lote.temp_impressao_min ?? '?'}–${lote.temp_impressao_max ?? '?'} °C`
                          : '-'}
                      </td>
                      <td>{lote.observacao || '-'}</td>
                      <td>
                        <button className="btn-small" onClick={() => abrirLote(lote)}>
                          Movimentar
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {lotes.length === 0 && (
                  <tr>
                    <td colSpan={11}>Nenhum lote cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <button type="button" className="btn-small" style={{ marginTop: 8 }} onClick={() => setNovoLoteOpen(true)}>
            + Novo Lote
          </button>
        </div>
      </div>

      {novoLoteOpen && (
        <div className="modal-overlay" onClick={() => setNovoLoteOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Novo Lote — {alvo.tipo_nome} ({alvo.cor})
              </h3>
              <button type="button" className="modal-close" onClick={() => setNovoLoteOpen(false)} aria-label="Fechar">
                ×
              </button>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleCriarLote}>
              <div className="form-grid">
                <div className="field">
                  <label>Marca</label>
                  <input
                    list="lotes-marcas-sugeridas"
                    value={novoLoteForm.marca}
                    onChange={(e) => setNovoLoteForm({ ...novoLoteForm, marca: e.target.value.toUpperCase() })}
                  />
                  <datalist id="lotes-marcas-sugeridas">
                    {marcasSugeridas.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
                <div className="field">
                  <label>Fornecedor</label>
                  <input
                    list="lotes-fornecedores-sugeridos"
                    value={novoLoteForm.fornecedor}
                    onChange={(e) => setNovoLoteForm({ ...novoLoteForm, fornecedor: e.target.value.toUpperCase() })}
                  />
                  <datalist id="lotes-fornecedores-sugeridos">
                    {fornecedoresSugeridos.map((f) => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                </div>
                <div className="field">
                  <label>Custo Total do Lote (R$)</label>
                  <div className="input-prefix-group">
                    <span className="input-prefix">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={novoLoteForm.valor_custo}
                      onChange={(e) => setNovoLoteForm({ ...novoLoteForm, valor_custo: e.target.value })}
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Quantidade inicial ({alvo.unidade_medida_sigla})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={novoLoteForm.quantidade_inicial}
                    onChange={(e) => setNovoLoteForm({ ...novoLoteForm, quantidade_inicial: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Data da Compra</label>
                  <input
                    type="date"
                    value={novoLoteForm.data_compra || hoje()}
                    onChange={(e) => setNovoLoteForm({ ...novoLoteForm, data_compra: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Observação</label>
                  <input
                    value={novoLoteForm.observacao}
                    onChange={(e) => setNovoLoteForm({ ...novoLoteForm, observacao: e.target.value.toUpperCase() })}
                    placeholder="Nº da nota fiscal, etc."
                  />
                </div>
                <div className="field">
                  <label>Temp. Mesa Mínimo (°C)</label>
                  <input
                    type="number"
                    value={novoLoteForm.temp_mesa_min}
                    onChange={(e) => setNovoLoteForm({ ...novoLoteForm, temp_mesa_min: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Temp. Mesa Máximo (°C)</label>
                  <input
                    type="number"
                    value={novoLoteForm.temp_mesa_max}
                    onChange={(e) => setNovoLoteForm({ ...novoLoteForm, temp_mesa_max: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Temp. Impressão Mínimo (°C)</label>
                  <input
                    type="number"
                    value={novoLoteForm.temp_impressao_min}
                    onChange={(e) => setNovoLoteForm({ ...novoLoteForm, temp_impressao_min: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Temp. Impressão Máximo (°C)</label>
                  <input
                    type="number"
                    value={novoLoteForm.temp_impressao_max}
                    onChange={(e) => setNovoLoteForm({ ...novoLoteForm, temp_impressao_max: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button className="btn-primary" type="submit" disabled={salvandoLote} style={{ width: 'auto', padding: '10px 20px' }}>
                  {salvandoLote ? 'Salvando...' : 'Criar Lote'}
                </button>
                <button
                  type="button"
                  className="btn-small"
                  onClick={() => {
                    setNovoLoteOpen(false);
                    setNovoLoteForm(emptyNovoLote);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loteSelecionado && (
        <div className="modal-overlay" onClick={fecharLote}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Movimentar Lote #{loteSelecionado.codigo}
                <br />
                <small style={{ color: '#64748b', fontWeight: 400 }}>
                  Saldo físico: {loteSelecionado.saldo} {alvo.unidade_medida_sigla}
                  {Number(loteSelecionado.reservado) > 0
                    ? ` · Reservado: ${loteSelecionado.reservado} ${alvo.unidade_medida_sigla}`
                    : ''}
                  {loteSelecionado.fornecedor ? ` · ${loteSelecionado.fornecedor}` : ''}
                </small>
              </h3>
              <button type="button" className="modal-close" onClick={fecharLote} aria-label="Fechar">
                ×
              </button>
            </div>

            {movError && <div className="error-msg">{movError}</div>}

            <form onSubmit={handleMovimentar}>
              <div className="form-grid">
                <div className="field">
                  <label>Tipo</label>
                  <select
                    value={movForm.tipo}
                    onChange={(e) => setMovForm({ ...movForm, tipo: e.target.value as 'ENTRADA' | 'SAIDA' })}
                  >
                    <option value="ENTRADA">Entrada</option>
                    <option value="SAIDA">Saída</option>
                  </select>
                </div>
                <div className="field">
                  <label>Quantidade ({alvo.unidade_medida_sigla})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={movForm.quantidade}
                    onChange={(e) => setMovForm({ ...movForm, quantidade: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Observação</label>
                  <input
                    value={movForm.observacao}
                    onChange={(e) => setMovForm({ ...movForm, observacao: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
              <button
                className="btn-primary"
                type="submit"
                disabled={salvandoMov}
                style={{ width: 'auto', padding: '10px 20px', marginTop: 8 }}
              >
                {salvandoMov ? 'Salvando...' : 'Registrar'}
              </button>
            </form>

            <h4 style={{ marginTop: 20 }}>Histórico deste lote</h4>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Quantidade</th>
                    <th>Observação</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {movimentacoes.map((mov) => (
                    <tr key={mov.codigo}>
                      <td>{new Date(mov.criado_em).toLocaleString('pt-BR')}</td>
                      <td>{mov.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}</td>
                      <td>
                        {mov.quantidade} {alvo.unidade_medida_sigla}
                      </td>
                      <td>{mov.observacao || '-'}</td>
                      <td>
                        <button
                          className="icon-btn danger"
                          title="Excluir"
                          onClick={() => handleDeleteMovimentacao(mov.codigo)}
                        >
                          <IconTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {movimentacoes.length === 0 && (
                    <tr>
                      <td colSpan={5}>Nenhuma movimentação registrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
