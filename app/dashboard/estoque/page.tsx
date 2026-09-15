'use client';

import { useEffect, useState, FormEvent } from 'react';
import SearchBox from '../search-box';

interface ItemEstoque {
  codigo: number;
  tipo_nome: string;
  marca: string;
  cor: string;
  cor_hex: string;
  fornecedor: string | null;
  saldo: string;
  unidade_medida_sigla: string;
}

interface Movimentacao {
  codigo: number;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidade: string;
  observacao: string | null;
  criado_em: string;
}

const emptyForm = { tipo: 'ENTRADA' as 'ENTRADA' | 'SAIDA', quantidade: '', observacao: '' };

export default function EstoquePage() {
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [selecionado, setSelecionado] = useState<ItemEstoque | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

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

  async function abrirItem(item: ItemEstoque) {
    setSelecionado(item);
    setForm(emptyForm);
    setError('');
    const res = await fetch(`/api/estoque/${item.codigo}`);
    if (res.ok) setMovimentacoes(await res.json());
  }

  function fechar() {
    setSelecionado(null);
    setMovimentacoes([]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selecionado) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/estoque/movimentar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materia_prima_codigo: selecionado.codigo,
          tipo: form.tipo,
          quantidade: form.quantidade,
          observacao: form.observacao,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Não foi possível registrar a movimentação.');
        return;
      }
      setForm(emptyForm);
      await load();
      const atualizado = (await (await fetch('/api/estoque')).json()) as ItemEstoque[];
      const item = atualizado.find((i) => i.codigo === selecionado.codigo);
      if (item) setSelecionado(item);
      const res2 = await fetch(`/api/estoque/${selecionado.codigo}`);
      if (res2.ok) setMovimentacoes(await res2.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteMovimentacao(movCodigo: number) {
    if (!selecionado) return;
    if (!confirm('Deseja realmente excluir esta movimentação?')) return;
    setError('');
    const res = await fetch(`/api/estoque/movimentacao/${movCodigo}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Não foi possível excluir a movimentação.');
      return;
    }
    await load();
    const atualizado = (await (await fetch('/api/estoque')).json()) as ItemEstoque[];
    const item = atualizado.find((i) => i.codigo === selecionado.codigo);
    if (item) setSelecionado(item);
    const res2 = await fetch(`/api/estoque/${selecionado.codigo}`);
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
              <th>Fornecedor</th>
              <th>Saldo</th>
              <th>Unidade</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itensFiltrados.map((item) => (
              <tr key={item.codigo}>
                <td>{item.codigo}</td>
                <td>{item.tipo_nome}</td>
                <td>{item.marca}</td>
                <td>
                  <span className="color-swatch" style={{ backgroundColor: item.cor_hex }} />
                  {item.cor}
                </td>
                <td>{item.fornecedor || '-'}</td>
                <td>{item.saldo}</td>
                <td>{item.unidade_medida_sigla}</td>
                <td>
                  <button className="btn-small" onClick={() => abrirItem(item)}>
                    Movimentar
                  </button>
                </td>
              </tr>
            ))}
            {itensFiltrados.length === 0 && (
              <tr>
                <td colSpan={8}>Nenhuma matéria prima encontrada.</td>
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
                Saldo atual: {selecionado.saldo} {selecionado.unidade_medida_sigla}
              </small>
            </h3>
            <button className="btn-small" onClick={fechar}>
              Fechar
            </button>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <label>Tipo</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value as 'ENTRADA' | 'SAIDA' })}
                >
                  <option value="ENTRADA">Entrada</option>
                  <option value="SAIDA">Saída</option>
                </select>
              </div>
              <div className="field">
                <label>Quantidade ({selecionado.unidade_medida_sigla})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.quantidade}
                  onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Observação</label>
                <input
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                />
              </div>
            </div>
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: 'auto', padding: '10px 20px', marginTop: 16 }}>
              {loading ? 'Salvando...' : 'Registrar'}
            </button>
          </form>

          <h4 style={{ marginTop: 24 }}>Histórico</h4>
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
                      {mov.quantidade} {selecionado.unidade_medida_sigla}
                    </td>
                    <td>{mov.observacao || '-'}</td>
                    <td>
                      <button
                        className="btn-small danger"
                        onClick={() => handleDeleteMovimentacao(mov.codigo)}
                      >
                        Excluir
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
      )}
    </div>
  );
}
