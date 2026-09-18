'use client';

import { useEffect, useState, FormEvent } from 'react';
import SearchBox from '../search-box';
import { IconEdit, IconCopy, IconTrash } from '../icons';

interface Grupo {
  codigo: number;
  nome: string;
}

export default function GruposProdutosPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [nome, setNome] = useState('');
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const gruposFiltrados = grupos.filter((grupo) => grupo.nome.toLowerCase().includes(busca.toLowerCase()));

  async function load() {
    const res = await fetch('/api/grupos-produtos');
    if (res.ok) setGrupos(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setEditingCodigo(null);
    setNome('');
    setError('');
    setModalOpen(true);
  }

  function startEdit(grupo: Grupo) {
    setEditingCodigo(grupo.codigo);
    setNome(grupo.nome);
    setError('');
    setModalOpen(true);
  }

  function startCopy(grupo: Grupo) {
    setEditingCodigo(null);
    setNome(`${grupo.nome} (cópia)`);
    setError('');
    setModalOpen(true);
  }

  function cancelEdit() {
    setEditingCodigo(null);
    setNome('');
    setError('');
    setModalOpen(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = editingCodigo ? `/api/grupos-produtos/${editingCodigo}` : '/api/grupos-produtos';
      const method = editingCodigo ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
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
    if (!confirm('Excluir este grupo?')) return;
    const res = await fetch(`/api/grupos-produtos/${codigo}`, { method: 'DELETE' });
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
        <h2>Cadastro de Grupo de Produtos</h2>
        <button className="btn-primary" onClick={startNew} style={{ width: 'auto', padding: '10px 20px' }}>
          Novo Grupo
        </button>
      </div>

      <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por nome..." />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {gruposFiltrados.map((grupo) => (
              <tr key={grupo.codigo}>
                <td>{grupo.codigo}</td>
                <td>{grupo.nome}</td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" title="Editar" onClick={() => startEdit(grupo)}>
                      <IconEdit />
                    </button>
                    <button className="icon-btn" title="Copiar" onClick={() => startCopy(grupo)}>
                      <IconCopy />
                    </button>
                    <button className="icon-btn danger" title="Excluir" onClick={() => handleDelete(grupo.codigo)}>
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {gruposFiltrados.length === 0 && (
              <tr>
                <td colSpan={3}>Nenhum grupo encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>{editingCodigo ? 'Editar grupo' : 'Novo grupo'}</h3>
              <button type="button" className="modal-close" onClick={cancelEdit} aria-label="Fechar">
                ×
              </button>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Nome</label>
                <input
                  placeholder="CHAVEIROS, DECORAÇÃO, BRINDES..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value.toUpperCase())}
                  required
                />
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
