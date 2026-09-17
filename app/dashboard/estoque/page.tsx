'use client';

import { useEffect, useState, FormEvent } from 'react';
import SearchBox from '../search-box';
import { IconTrash } from '../icons';

interface ItemEstoque {
  codigo: number;
  tipo_nome: string;
  marca: string;
  cor: string;
  cor_hex: string;
  saldo: string;
  unidade_medida_sigla: string;
  total_lotes: string;
  reservado: string;
}

interface Lote {
  codigo: number;
  fornecedor: string | null;
  valor_custo: string | null;
  data_compra: string | null;
  observacao: string | null;
  criado_em: string;
  saldo: string;
  reservado: string;
}

interface Movimentacao {
  codigo: number;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidade: string;
  observacao: string | null;
  criado_em: string;
}

const emptyNovoLote = { fornecedor: '', valor_custo: '', quantidade_inicial: '', data_compra: '', observacao: '' };
const emptyMovForm = { tipo: 'ENTRADA' as 'ENTRADA' | 'SAIDA', quantidade: '', observacao: '' };

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export default function EstoquePage() {
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [selecionado, setSelecionado] = useState<ItemEstoque | null>(null);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [busca, setBusca] = useState('');
  const [error, setError] = useState('');

  const [novoLoteOpen, setNovoLoteOpen] = useState(false);
  const [novoLoteForm, setNovoLoteForm] = useState(emptyNovoLote);
  const [salvandoLote, setSalvandoLote] = useState(false);

  const [loteSelecionado, setLoteSelecionado] = useState<Lote | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [movForm, setMovForm] = useState(emptyMovForm);
  const [salvandoMov, setSalvandoMov] = useState(false);
  const [movError, setMovError] = useState('');

  const itensFiltrados = itens.filter((item) => {
    const q = busca.toLowerCase();
    return (
      item.tipo_nome.toLowerCase().includes(q) ||
      item.marca.toLowerCase().includes(q) ||
      item.cor.toLowerCase().includes(q)
    );
  });

  async function load() {
    const res = await fetch('/api/estoque');
    if (res.ok) setItens(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function carregarLotes(codigo: number) {
    const res = await fetch(`/api/estoque/${codigo}`);
    if (res.ok) setLotes(await res.json());
  }

  async function abrirCor(item: ItemEstoque) {
    setSelecionado(item);
    setError('');
    setNovoLoteOpen(false);
    setNovoLoteForm(emptyNovoLote);
    await carregarLotes(item.codigo);
  }

  function fecharCor() {
    setSelecionado(null);
    setLotes([]);
    setNovoLoteOpen(false);
  }

  async function atualizarTudo() {
    await load();
    if (selecionado) {
      const atualizado = (await (await fetch('/api/estoque')).json()) as ItemEstoque[];
      const item = atualizado.find((i) => i.codigo === selecionado.codigo);
      if (item) setSelecionado(item);
      await carregarLotes(selecionado.codigo);
    }
  }

  async function handleCriarLote(e: FormEvent) {
    e.preventDefault();
    if (!selecionado) return;
    setError('');
    setSalvandoLote(true);
    try {
      const res = await fetch(`/api/estoque/${selecionado.codigo}`, {
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
      const lotesAtualizados = await (await fetch(`/api/estoque/${selecionado!.codigo}`)).json();
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

  return (
    <div>
      <div className="page-header">
        <h2>Controle de Estoque</h2>
      </div>

      <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por tipo, marca ou cor..." />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>Marca</th>
              <th>Cor</th>
              <th>Saldo Físico</th>
              <th>Reservado</th>
              <th>Disponível</th>
              <th>Unidade</th>
              <th>Lotes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itensFiltrados.map((item) => {
              const disponivel = Number(item.saldo) - Number(item.reservado);
              return (
                <tr key={item.codigo}>
                  <td>{item.codigo}</td>
                  <td>{item.tipo_nome}</td>
                  <td>{item.marca}</td>
                  <td>
                    <span className="color-swatch" style={{ backgroundColor: item.cor_hex }} />
                    {item.cor}
                  </td>
                  <td>{item.saldo}</td>
                  <td>{Number(item.reservado) > 0 ? item.reservado : '-'}</td>
                  <td style={{ color: disponivel <= 0 ? '#dc2626' : undefined, fontWeight: 600 }}>
                    {disponivel.toFixed(2)}
                  </td>
                  <td>{item.unidade_medida_sigla}</td>
                  <td>{item.total_lotes}</td>
                  <td>
                    <button className="btn-small" onClick={() => abrirCor(item)}>
                      Ver Lotes
                    </button>
                  </td>
                </tr>
              );
            })}
            {itensFiltrados.length === 0 && (
              <tr>
                <td colSpan={10}>Nenhuma matéria prima encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selecionado && (
        <div className="card">
          <div className="card-header">
            <h3>
              {selecionado.tipo_nome} — {selecionado.marca} ({selecionado.cor})
              <br />
              <small style={{ color: '#64748b', fontWeight: 400 }}>
                Saldo total: {selecionado.saldo} {selecionado.unidade_medida_sigla}
              </small>
            </h3>
            <button className="btn-small" onClick={fecharCor}>
              Fechar
            </button>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fornecedor</th>
                  <th>Custo</th>
                  <th>Data da Compra</th>
                  <th>Saldo Físico</th>
                  <th>Reservado</th>
                  <th>Disponível</th>
                  <th>Observação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lotes.map((lote) => {
                  const disponivel = Number(lote.saldo) - Number(lote.reservado);
                  return (
                    <tr key={lote.codigo}>
                      <td>{lote.fornecedor || '-'}</td>
                      <td>{lote.valor_custo ? `R$ ${Number(lote.valor_custo).toFixed(2)}` : '-'}</td>
                      <td>
                        {lote.data_compra
                          ? new Date(lote.data_compra).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                          : '-'}
                      </td>
                      <td>
                        {lote.saldo} {selecionado.unidade_medida_sigla}
                      </td>
                      <td>{Number(lote.reservado) > 0 ? `${lote.reservado} ${selecionado.unidade_medida_sigla}` : '-'}</td>
                      <td style={{ color: disponivel <= 0 ? '#dc2626' : undefined, fontWeight: 600 }}>
                        {disponivel.toFixed(2)} {selecionado.unidade_medida_sigla}
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
                    <td colSpan={8}>Nenhum lote cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!novoLoteOpen ? (
            <button type="button" className="btn-small" style={{ marginTop: 8 }} onClick={() => setNovoLoteOpen(true)}>
              + Novo Lote
            </button>
          ) : (
            <form onSubmit={handleCriarLote} style={{ marginTop: 12 }}>
              <h4 style={{ marginBottom: 8 }}>Novo Lote</h4>
              <div className="form-grid">
                <div className="field">
                  <label>Fornecedor</label>
                  <input
                    value={novoLoteForm.fornecedor}
                    onChange={(e) => setNovoLoteForm({ ...novoLoteForm, fornecedor: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="field">
                  <label>Custo (R$/{selecionado.unidade_medida_sigla})</label>
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
                  <label>Quantidade inicial ({selecionado.unidade_medida_sigla})</label>
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
          )}
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
                  Saldo físico: {loteSelecionado.saldo} {selecionado?.unidade_medida_sigla}
                  {Number(loteSelecionado.reservado) > 0
                    ? ` · Reservado: ${loteSelecionado.reservado} ${selecionado?.unidade_medida_sigla}`
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
                  <label>Quantidade ({selecionado?.unidade_medida_sigla})</label>
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
                        {mov.quantidade} {selecionado?.unidade_medida_sigla}
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
    </div>
  );
}
