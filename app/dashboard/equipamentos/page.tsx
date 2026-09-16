'use client';

import { useEffect, useState, FormEvent } from 'react';
import SearchBox from '../search-box';

interface Equipamento {
  codigo: number;
  fabricante: string;
  modelo: string;
  consumo_w_hora: string;
}

const emptyForm = { fabricante: '', modelo: '', consumo_w_hora: '' };

export default function EquipamentosPage() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const equipamentosFiltrados = equipamentos.filter((eq) => {
    const q = busca.toLowerCase();
    return eq.fabricante.toLowerCase().includes(q) || eq.modelo.toLowerCase().includes(q);
  });

  async function load() {
    const res = await fetch('/api/equipamentos');
    if (res.ok) setEquipamentos(await res.json());
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

  function startEdit(eq: Equipamento) {
    setEditingCodigo(eq.codigo);
    setForm({ fabricante: eq.fabricante, modelo: eq.modelo, consumo_w_hora: eq.consumo_w_hora });
    setError('');
    setModalOpen(true);
  }

  function startCopy(eq: Equipamento) {
    setEditingCodigo(null);
    setForm({ fabricante: eq.fabricante, modelo: `${eq.modelo} (cópia)`, consumo_w_hora: eq.consumo_w_hora });
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
      const url = editingCodigo ? `/api/equipamentos/${editingCodigo}` : '/api/equipamentos';
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
    if (!confirm('Excluir este equipamento?')) return;
    const res = await fetch(`/api/equipamentos/${codigo}`, { method: 'DELETE' });
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
        <h2>Cadastro de Equipamentos</h2>
        <button className="btn-primary" onClick={startNew} style={{ width: 'auto', padding: '10px 20px' }}>
          Novo Equipamento
        </button>
      </div>

      <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por fabricante ou modelo..." />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Fabricante</th>
              <th>Modelo</th>
              <th>Consumo (W/h)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {equipamentosFiltrados.map((eq) => (
              <tr key={eq.codigo}>
                <td>{eq.codigo}</td>
                <td>{eq.fabricante}</td>
                <td>{eq.modelo}</td>
                <td>{eq.consumo_w_hora}</td>
                <td>
                  <button className="btn-small" onClick={() => startEdit(eq)}>
                    Editar
                  </button>
                  <button className="btn-small" onClick={() => startCopy(eq)}>
                    Copiar
                  </button>
                  <button className="btn-small danger" onClick={() => handleDelete(eq.codigo)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {equipamentosFiltrados.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhum equipamento encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>{editingCodigo ? 'Editar equipamento' : 'Novo equipamento'}</h3>
              <button type="button" className="modal-close" onClick={cancelEdit} aria-label="Fechar">
                ×
              </button>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label>Fabricante</label>
                  <input
                    value={form.fabricante}
                    onChange={(e) => setForm({ ...form, fabricante: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Modelo</label>
                  <input
                    value={form.modelo}
                    onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Consumo (W por hora)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.consumo_w_hora}
                    onChange={(e) => setForm({ ...form, consumo_w_hora: e.target.value })}
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
