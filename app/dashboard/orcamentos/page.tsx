'use client';

import { useEffect, useState, FormEvent } from 'react';
import SearchBox from '../search-box';

interface Orcamento {
  codigo: number;
  cliente_codigo: number;
  cliente_nome: string;
  data: string;
  status: 'ABERTO' | 'APROVADO' | 'REJEITADO';
  observacoes: string | null;
  valor_total: string;
}

interface Cliente {
  codigo: number;
  nome: string;
}

interface Produto {
  codigo: number;
  descricao: string;
}

interface ItemOrcamento {
  codigo: number;
  produto_codigo: number;
  produto_descricao: string;
  quantidade: string;
  valor_unitario: string;
  subtotal: string;
}

const emptyForm = { cliente_codigo: '', data: '', status: 'ABERTO' as Orcamento['status'], observacoes: '' };

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const [selecionado, setSelecionado] = useState<Orcamento | null>(null);
  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [novoItem, setNovoItem] = useState({ produto_codigo: '', quantidade: '', valor_unitario: '' });
  const [itemError, setItemError] = useState('');

  const orcamentosFiltrados = orcamentos.filter((o) => {
    const q = busca.toLowerCase();
    return o.cliente_nome.toLowerCase().includes(q) || o.status.toLowerCase().includes(q);
  });

  async function load() {
    const [orcRes, cliRes, prodRes] = await Promise.all([
      fetch('/api/orcamentos'),
      fetch('/api/clientes'),
      fetch('/api/produtos'),
    ]);
    if (orcRes.ok) setOrcamentos(await orcRes.json());
    if (cliRes.ok) setClientes(await cliRes.json());
    if (prodRes.ok) setProdutos(await prodRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(o: Orcamento) {
    setEditingCodigo(o.codigo);
    setForm({
      cliente_codigo: String(o.cliente_codigo),
      data: o.data.slice(0, 10),
      status: o.status,
      observacoes: o.observacoes || '',
    });
    setError('');
  }

  function cancelEdit() {
    setEditingCodigo(null);
    setForm(emptyForm);
    setError('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = editingCodigo ? `/api/orcamentos/${editingCodigo}` : '/api/orcamentos';
      const method = editingCodigo ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, data: form.data || hoje() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Não foi possível salvar.');
        return;
      }
      cancelEdit();
      load();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(codigo: number) {
    if (!confirm('Excluir este orçamento?')) return;
    const res = await fetch(`/api/orcamentos/${codigo}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Não foi possível excluir.');
      return;
    }
    load();
  }

  async function abrirItens(o: Orcamento) {
    setSelecionado(o);
    setItemError('');
    setNovoItem({ produto_codigo: '', quantidade: '', valor_unitario: '' });
    const res = await fetch(`/api/orcamentos/${o.codigo}/itens`);
    if (res.ok) setItens(await res.json());
  }

  function fecharItens() {
    setSelecionado(null);
    setItens([]);
  }

  async function refreshItens(codigo: number) {
    const [itensRes, orcRes] = await Promise.all([
      fetch(`/api/orcamentos/${codigo}/itens`),
      fetch('/api/orcamentos'),
    ]);
    if (itensRes.ok) setItens(await itensRes.json());
    if (orcRes.ok) {
      const lista: Orcamento[] = await orcRes.json();
      setOrcamentos(lista);
      const atual = lista.find((o) => o.codigo === codigo);
      if (atual) setSelecionado(atual);
    }
  }

  async function handleAddItem(e: FormEvent) {
    e.preventDefault();
    if (!selecionado) return;
    setItemError('');
    const res = await fetch(`/api/orcamentos/${selecionado.codigo}/itens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoItem),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setItemError(data.error || 'Não foi possível adicionar.');
      return;
    }
    setNovoItem({ produto_codigo: '', quantidade: '', valor_unitario: '' });
    await refreshItens(selecionado.codigo);
  }

  async function handleDeleteItem(itemCodigo: number) {
    if (!selecionado) return;
    await fetch(`/api/orcamentos/${selecionado.codigo}/itens/${itemCodigo}`, { method: 'DELETE' });
    await refreshItens(selecionado.codigo);
  }

  return (
    <div>
      <div className="page-header">
        <h2>Orçamentos</h2>
      </div>

      {clientes.length === 0 && (
        <div className="error-msg">
          Cadastre pelo menos um Cliente antes de criar um orçamento.
        </div>
      )}

      <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por cliente ou status..." />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Data</th>
              <th>Status</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orcamentosFiltrados.map((o) => (
              <tr key={o.codigo}>
                <td>{o.codigo}</td>
                <td>{o.cliente_nome}</td>
                <td>{new Date(o.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td>{o.status}</td>
                <td>R$ {o.valor_total}</td>
                <td>
                  <button className="btn-small" onClick={() => startEdit(o)}>
                    Editar
                  </button>
                  <button className="btn-small" onClick={() => abrirItens(o)}>
                    Itens
                  </button>
                  <button className="btn-small danger" onClick={() => handleDelete(o.codigo)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {orcamentosFiltrados.length === 0 && (
              <tr>
                <td colSpan={6}>Nenhum orçamento encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{editingCodigo ? 'Editar orçamento' : 'Novo orçamento'}</h3>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Cliente</label>
              <select
                value={form.cliente_codigo}
                onChange={(e) => setForm({ ...form, cliente_codigo: e.target.value })}
                required
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {clientes.map((c) => (
                  <option key={c.codigo} value={c.codigo}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Data</label>
              <input
                type="date"
                value={form.data || hoje()}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Orcamento['status'] })}
              >
                <option value="ABERTO">Aberto</option>
                <option value="APROVADO">Aprovado</option>
                <option value="REJEITADO">Rejeitado</option>
              </select>
            </div>
            <div className="field">
              <label>Observações</label>
              <input
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: 'auto', padding: '10px 20px' }}>
              {editingCodigo ? 'Salvar' : 'Adicionar'}
            </button>
            {editingCodigo && (
              <button type="button" className="btn-small" onClick={cancelEdit}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {selecionado && (
        <div className="card">
          <div className="card-header">
            <h3>
              Itens do orçamento #{selecionado.codigo} — {selecionado.cliente_nome}
              <br />
              <small style={{ color: '#64748b', fontWeight: 400 }}>
                Total: R$ {selecionado.valor_total}
              </small>
            </h3>
            <button className="btn-small" onClick={fecharItens}>
              Fechar
            </button>
          </div>

          {itemError && <div className="error-msg">{itemError}</div>}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Quantidade</th>
                  <th>Valor Unitário</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.codigo}>
                    <td>{item.produto_descricao}</td>
                    <td>{item.quantidade}</td>
                    <td>R$ {item.valor_unitario}</td>
                    <td>R$ {item.subtotal}</td>
                    <td>
                      <button className="btn-small danger" onClick={() => handleDeleteItem(item.codigo)}>
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
                {itens.length === 0 && (
                  <tr>
                    <td colSpan={5}>Nenhum item adicionado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <form onSubmit={handleAddItem}>
            <div className="form-grid">
              <div className="field">
                <label>Produto</label>
                <select
                  value={novoItem.produto_codigo}
                  onChange={(e) => setNovoItem({ ...novoItem, produto_codigo: e.target.value })}
                  required
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {produtos.map((p) => (
                    <option key={p.codigo} value={p.codigo}>
                      {p.descricao}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Quantidade</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={novoItem.quantidade}
                  onChange={(e) => setNovoItem({ ...novoItem, quantidade: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Valor Unitário (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={novoItem.valor_unitario}
                  onChange={(e) => setNovoItem({ ...novoItem, valor_unitario: e.target.value })}
                  required
                />
              </div>
            </div>
            <button className="btn-small" type="submit" style={{ marginTop: 8 }}>
              Adicionar item
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
