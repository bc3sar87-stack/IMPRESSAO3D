'use client';

import { useEffect, useState, FormEvent } from 'react';

interface Empresa {
  codigo: number;
  cnpj: string;
  razao_social: string;
}

const emptyForm = { cnpj: '', razao_social: '' };

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch('/api/empresas');
    if (res.ok) setEmpresas(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(emp: Empresa) {
    setEditingCodigo(emp.codigo);
    setForm({ cnpj: emp.cnpj, razao_social: emp.razao_social });
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
      const url = editingCodigo ? `/api/empresas/${editingCodigo}` : '/api/empresas';
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
    if (!confirm('Excluir esta empresa?')) return;
    const res = await fetch(`/api/empresas/${codigo}`, { method: 'DELETE' });
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
        <h2>Cadastro de Empresas</h2>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>CNPJ</th>
              <th>Razão Social</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((emp) => (
              <tr key={emp.codigo}>
                <td>{emp.codigo}</td>
                <td>{emp.cnpj}</td>
                <td>{emp.razao_social}</td>
                <td>
                  <button className="btn-small" onClick={() => startEdit(emp)}>
                    Editar
                  </button>
                  <button className="btn-small danger" onClick={() => handleDelete(emp.codigo)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {empresas.length === 0 && (
              <tr>
                <td colSpan={4}>Nenhuma empresa cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{editingCodigo ? 'Editar empresa' : 'Nova empresa'}</h3>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>CNPJ</label>
              <input
                placeholder="00.000.000/0000-00"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Razão Social</label>
              <input
                value={form.razao_social}
                onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
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
