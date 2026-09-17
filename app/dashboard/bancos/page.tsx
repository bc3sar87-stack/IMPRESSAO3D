'use client';

import { useEffect, useState, FormEvent } from 'react';
import SearchBox from '../search-box';
import { IconEdit, IconCopy, IconTrash } from '../icons';

interface Banco {
  codigo: number;
  codigo_banco: string;
  agencia: string;
  num_conta: string;
  descricao: string | null;
}

const emptyForm = { codigo_banco: '', agencia: '', num_conta: '', descricao: '' };

export default function BancosPage() {
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const bancosFiltrados = bancos.filter((b) => {
    const q = busca.toLowerCase();
    return (
      b.codigo_banco.toLowerCase().includes(q) ||
      b.agencia.toLowerCase().includes(q) ||
      b.num_conta.toLowerCase().includes(q) ||
      (b.descricao || '').toLowerCase().includes(q)
    );
  });

  async function load() {
    const res = await fetch('/api/bancos');
    if (res.ok) setBancos(await res.json());
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

  function startEdit(b: Banco) {
    setEditingCodigo(b.codigo);
    setForm({
      codigo_banco: b.codigo_banco,
      agencia: b.agencia,
      num_conta: b.num_conta,
      descricao: b.descricao || '',
    });
    setError('');
    setModalOpen(true);
  }

  function startCopy(b: Banco) {
    setEditingCodigo(null);
    setForm({
      codigo_banco: b.codigo_banco,
      agencia: b.agencia,
      num_conta: b.num_conta,
      descricao: b.descricao ? `${b.descricao} (cópia)` : '',
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
      const url = editingCodigo ? `/api/bancos/${editingCodigo}` : '/api/bancos';
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
    if (!confirm('Excluir este banco?')) return;
    const res = await fetch(`/api/bancos/${codigo}`, { method: 'DELETE' });
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
        <h2>Cadastro de Banco</h2>
        <button className="btn-primary" onClick={startNew} style={{ width: 'auto', padding: '10px 20px' }}>
          Novo Banco
        </button>
      </div>

      <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por código, agência, conta ou descrição..." />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Código Banco</th>
              <th>Agência</th>
              <th>Número da Conta</th>
              <th>Descrição</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bancosFiltrados.map((b) => (
              <tr key={b.codigo}>
                <td>{b.codigo}</td>
                <td>{b.codigo_banco}</td>
                <td>{b.agencia}</td>
                <td>{b.num_conta}</td>
                <td>{b.descricao || '-'}</td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" title="Editar" onClick={() => startEdit(b)}>
                      <IconEdit />
                    </button>
                    <button className="icon-btn" title="Copiar" onClick={() => startCopy(b)}>
                      <IconCopy />
                    </button>
                    <button className="icon-btn danger" title="Excluir" onClick={() => handleDelete(b.codigo)}>
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {bancosFiltrados.length === 0 && (
              <tr>
                <td colSpan={6}>Nenhum banco encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCodigo ? 'Editar banco' : 'Novo banco'}</h3>
              <button type="button" className="modal-close" onClick={cancelEdit} aria-label="Fechar">
                ×
              </button>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label>Código Banco</label>
                  <input
                    value={form.codigo_banco}
                    onChange={(e) => setForm({ ...form, codigo_banco: e.target.value })}
                    placeholder="001, 341, 260..."
                    required
                  />
                </div>
                <div className="field">
                  <label>Agência</label>
                  <input
                    value={form.agencia}
                    onChange={(e) => setForm({ ...form, agencia: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Número da Conta</label>
                  <input
                    value={form.num_conta}
                    onChange={(e) => setForm({ ...form, num_conta: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Descrição</label>
                  <input
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value.toUpperCase() })}
                    placeholder="Conta corrente principal..."
                  />
                </div>
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
