'use client';

import { useEffect, useState, FormEvent } from 'react';

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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch('/api/equipamentos');
    if (res.ok) setEquipamentos(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(eq: Equipamento) {
    setEditingCodigo(eq.codigo);
    setForm({ fabricante: eq.fabricante, modelo: eq.modelo, consumo_w_hora: eq.consumo_w_hora });
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
      </div>

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
            {equipamentos.map((eq) => (
              <tr key={eq.codigo}>
                <td>{eq.codigo}</td>
                <td>{eq.fabricante}</td>
                <td>{eq.modelo}</td>
                <td>{eq.consumo_w_hora}</td>
                <td>
                  <button className="btn-small" onClick={() => startEdit(eq)}>
                    Editar
                  </button>
                  <button className="btn-small danger" onClick={() => handleDelete(eq.codigo)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {equipamentos.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhum equipamento cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{editingCodigo ? 'Editar equipamento' : 'Novo equipamento'}</h3>
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
            {editingCodigo && (
              <button type="button" className="btn-small" onClick={cancelEdit}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
