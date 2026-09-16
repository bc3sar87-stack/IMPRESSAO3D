'use client';

import { useEffect, useState, FormEvent } from 'react';
import SearchBox from '../search-box';
import { IconEdit, IconCopy, IconTrash } from '../icons';

interface Unidade {
  codigo: number;
  sigla: string;
  nome: string;
}

const emptyForm = { sigla: '', nome: '' };

export default function UnidadesMedidaPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const unidadesFiltradas = unidades.filter((u) => {
    const q = busca.toLowerCase();
    return u.sigla.toLowerCase().includes(q) || u.nome.toLowerCase().includes(q);
  });

  async function load() {
    const res = await fetch('/api/unidades-medida');
    if (res.ok) setUnidades(await res.json());
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

  function startEdit(u: Unidade) {
    setEditingCodigo(u.codigo);
    setForm({ sigla: u.sigla, nome: u.nome });
    setError('');
    setModalOpen(true);
  }

  function startCopy(u: Unidade) {
    setEditingCodigo(null);
    setForm({ sigla: u.sigla, nome: `${u.nome} (cópia)` });
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
      const url = editingCodigo ? `/api/unidades-medida/${editingCodigo}` : '/api/unidades-medida';
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
    if (!confirm('Excluir esta unidade?')) return;
    const res = await fetch(`/api/unidades-medida/${codigo}`, { method: 'DELETE' });
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
        <h2>Cadastro de Unidade de Medida</h2>
        <button className="btn-primary" onClick={startNew} style={{ width: 'auto', padding: '10px 20px' }}>
          Nova Unidade
        </button>
      </div>

      <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por sigla ou nome..." />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Sigla</th>
              <th>Nome</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {unidadesFiltradas.map((u) => (
              <tr key={u.codigo}>
                <td>{u.codigo}</td>
                <td>{u.sigla}</td>
                <td>{u.nome}</td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" title="Editar" onClick={() => startEdit(u)}>
                      <IconEdit />
                    </button>
                    <button className="icon-btn" title="Copiar" onClick={() => startCopy(u)}>
                      <IconCopy />
                    </button>
                    <button className="icon-btn danger" title="Excluir" onClick={() => handleDelete(u.codigo)}>
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {unidadesFiltradas.length === 0 && (
              <tr>
                <td colSpan={4}>Nenhuma unidade encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>{editingCodigo ? 'Editar unidade' : 'Nova unidade'}</h3>
              <button type="button" className="modal-close" onClick={cancelEdit} aria-label="Fechar">
                ×
              </button>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label>Sigla</label>
                  <input
                    placeholder="UN, G, KG, M, L..."
                    value={form.sigla}
                    onChange={(e) => setForm({ ...form, sigla: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Nome</label>
                  <input
                    placeholder="Unitário, Gramas, Quilograma..."
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    required
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
