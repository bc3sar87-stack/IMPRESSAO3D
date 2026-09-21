'use client';

import { useEffect, useState, FormEvent } from 'react';
import SearchBox from '../search-box';
import { IconEdit, IconCopy, IconTrash } from '../icons';

interface TipoPedido {
  codigo: number;
  nome: string;
  movimenta_estoque: boolean;
  gera_conta_receber: boolean;
}

const emptyForm = {
  nome: '',
  movimenta_estoque: true,
  gera_conta_receber: true,
};

export default function TiposPedidoPage() {
  const [tipos, setTipos] = useState<TipoPedido[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const tiposFiltrados = tipos.filter((t) => t.nome.toLowerCase().includes(busca.toLowerCase()));

  async function load() {
    const res = await fetch('/api/tipos-pedido');
    if (res.ok) setTipos(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setEditingCodigo(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  }

  function startEdit(t: TipoPedido) {
    setEditingCodigo(t.codigo);
    setForm({
      nome: t.nome,
      movimenta_estoque: t.movimenta_estoque,
      gera_conta_receber: t.gera_conta_receber,
    });
    setError('');
    setModalOpen(true);
  }

  function startCopy(t: TipoPedido) {
    setEditingCodigo(null);
    setForm({
      nome: `${t.nome} (cópia)`,
      movimenta_estoque: t.movimenta_estoque,
      gera_conta_receber: t.gera_conta_receber,
    });
    setError('');
    setModalOpen(true);
  }

  function cancelEdit() {
    setEditingCodigo(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = editingCodigo ? `/api/tipos-pedido/${editingCodigo}` : '/api/tipos-pedido';
      const method = editingCodigo ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
    if (!confirm('Excluir este tipo de pedido?')) return;
    const res = await fetch(`/api/tipos-pedido/${codigo}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Não foi possível excluir.');
      return;
    }
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h2>Cadastro de Tipo de Pedido</h2>
        <button className="btn-primary" onClick={startNew} style={{ width: 'auto', padding: '10px 20px' }}>
          Novo Tipo de Pedido
        </button>
      </div>

      <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por nome..." />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>Movimenta Estoque?</th>
              <th>Gera Contas a Receber?</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tiposFiltrados.map((t) => (
              <tr key={t.codigo}>
                <td>{t.codigo}</td>
                <td>{t.nome}</td>
                <td>
                  <span className={`status-badge ${t.movimenta_estoque ? 'status-badge-blue' : 'status-badge-gray'}`}>
                    {t.movimenta_estoque ? 'Sim' : 'Não'}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${t.gera_conta_receber ? 'status-badge-blue' : 'status-badge-gray'}`}>
                    {t.gera_conta_receber ? 'Sim' : 'Não'}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" title="Editar" onClick={() => startEdit(t)}>
                      <IconEdit />
                    </button>
                    <button className="icon-btn" title="Copiar" onClick={() => startCopy(t)}>
                      <IconCopy />
                    </button>
                    <button className="icon-btn danger" title="Excluir" onClick={() => handleDelete(t.codigo)}>
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {tiposFiltrados.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhum tipo de pedido encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>{editingCodigo ? 'Editar tipo de pedido' : 'Novo tipo de pedido'}</h3>
              <button type="button" className="modal-close" onClick={cancelEdit} aria-label="Fechar">
                ×
              </button>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Nome</label>
                <input
                  placeholder="VENDA PADRÃO, BRINDE, AMOSTRA..."
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value.toUpperCase() })}
                  required
                />
              </div>
              <div className="field">
                <label>Movimenta Estoque?</label>
                <select
                  value={form.movimenta_estoque ? 'sim' : 'nao'}
                  onChange={(e) => setForm({ ...form, movimenta_estoque: e.target.value === 'sim' })}
                >
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
                <p className="hint">Define o valor padrão de &quot;Consome Estoque?&quot; ao usar este tipo no pedido.</p>
              </div>
              <div className="field">
                <label>Gera Contas a Receber?</label>
                <select
                  value={form.gera_conta_receber ? 'sim' : 'nao'}
                  onChange={(e) => setForm({ ...form, gera_conta_receber: e.target.value === 'sim' })}
                >
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
                <p className="hint">Define o valor padrão de &quot;Gerar Contas a Receber?&quot; ao usar este tipo no pedido.</p>
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button className="btn-primary" type="submit" disabled={loading} style={{ width: 'auto', padding: '10px 20px' }}>
                  {editingCodigo ? 'Salvar' : 'Adicionar'}
                </button>
                <button type="button" className="btn-small" onClick={cancelEdit}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
