'use client';

import { useEffect, useState, FormEvent } from 'react';
import SearchBox from '../search-box';

interface Tipo {
  codigo: number;
  nome: string;
}

export default function TiposMateriaPrimaPage() {
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [nome, setNome] = useState('');
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const tiposFiltrados = tipos.filter((tipo) => tipo.nome.toLowerCase().includes(busca.toLowerCase()));

  async function load() {
    const res = await fetch('/api/tipos-materia-prima');
    if (res.ok) setTipos(await res.json());
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

  function startEdit(tipo: Tipo) {
    setEditingCodigo(tipo.codigo);
    setNome(tipo.nome);
    setError('');
    setModalOpen(true);
  }

  function startCopy(tipo: Tipo) {
    setEditingCodigo(null);
    setNome(`${tipo.nome} (cópia)`);
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
      const url = editingCodigo ? `/api/tipos-materia-prima/${editingCodigo}` : '/api/tipos-materia-prima';
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
    if (!confirm('Excluir este tipo?')) return;
    const res = await fetch(`/api/tipos-materia-prima/${codigo}`, { method: 'DELETE' });
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
        <h2>Cadastro de Tipo</h2>
        <button className="btn-primary" onClick={startNew} style={{ width: 'auto', padding: '10px 20px' }}>
          Novo Tipo
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
            {tiposFiltrados.map((tipo) => (
              <tr key={tipo.codigo}>
                <td>{tipo.codigo}</td>
                <td>{tipo.nome}</td>
                <td>
                  <button className="btn-small" onClick={() => startEdit(tipo)}>
                    Editar
                  </button>
                  <button className="btn-small" onClick={() => startCopy(tipo)}>
                    Copiar
                  </button>
                  <button className="btn-small danger" onClick={() => handleDelete(tipo.codigo)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {tiposFiltrados.length === 0 && (
              <tr>
                <td colSpan={3}>Nenhum tipo encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>{editingCodigo ? 'Editar tipo' : 'Novo tipo'}</h3>
              <button type="button" className="modal-close" onClick={cancelEdit} aria-label="Fechar">
                ×
              </button>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Nome</label>
                <input
                  placeholder="PLA, ABS, PETG..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
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
