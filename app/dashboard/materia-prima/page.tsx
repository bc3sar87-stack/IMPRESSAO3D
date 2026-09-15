'use client';

import { useEffect, useState, FormEvent } from 'react';

interface MateriaPrima {
  codigo: number;
  tipo_codigo: number;
  tipo_nome: string;
  marca: string;
  descricao: string;
  cor: string;
  unidade_medida: 'UN' | 'G';
}

interface Tipo {
  codigo: number;
  nome: string;
}

const emptyForm = { tipo_codigo: '', marca: '', descricao: '', cor: '', unidade_medida: 'UN' as 'UN' | 'G' };

export default function MateriaPrimaPage() {
  const [itens, setItens] = useState<MateriaPrima[]>([]);
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    const [itensRes, tiposRes] = await Promise.all([
      fetch('/api/materia-prima'),
      fetch('/api/tipos-materia-prima'),
    ]);
    if (itensRes.ok) setItens(await itensRes.json());
    if (tiposRes.ok) setTipos(await tiposRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(item: MateriaPrima) {
    setEditingCodigo(item.codigo);
    setForm({
      tipo_codigo: String(item.tipo_codigo),
      marca: item.marca,
      descricao: item.descricao,
      cor: item.cor,
      unidade_medida: item.unidade_medida,
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
      const url = editingCodigo ? `/api/materia-prima/${editingCodigo}` : '/api/materia-prima';
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
    if (!confirm('Excluir esta matéria prima?')) return;
    const res = await fetch(`/api/materia-prima/${codigo}`, { method: 'DELETE' });
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
        <h2>Cadastro de Matéria Prima</h2>
      </div>

      {tipos.length === 0 && (
        <div className="error-msg">
          Cadastre pelo menos um Tipo (em Cadastros → Cadastro de Tipo) antes de criar uma matéria
          prima.
        </div>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>Marca</th>
              <th>Descrição</th>
              <th>Cor</th>
              <th>Unidade</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.codigo}>
                <td>{item.codigo}</td>
                <td>{item.tipo_nome}</td>
                <td>{item.marca}</td>
                <td>{item.descricao}</td>
                <td>{item.cor}</td>
                <td>{item.unidade_medida === 'UN' ? 'Unitário' : 'Gramas'}</td>
                <td>
                  <button className="btn-small" onClick={() => startEdit(item)}>
                    Editar
                  </button>
                  <button className="btn-small danger" onClick={() => handleDelete(item.codigo)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr>
                <td colSpan={7}>Nenhuma matéria prima cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{editingCodigo ? 'Editar matéria prima' : 'Nova matéria prima'}</h3>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Tipo</label>
              <select
                value={form.tipo_codigo}
                onChange={(e) => setForm({ ...form, tipo_codigo: e.target.value })}
                required
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {tipos.map((tipo) => (
                  <option key={tipo.codigo} value={tipo.codigo}>
                    {tipo.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Marca</label>
              <input
                value={form.marca}
                onChange={(e) => setForm({ ...form, marca: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Cor</label>
              <input
                value={form.cor}
                onChange={(e) => setForm({ ...form, cor: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Descrição</label>
              <input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Unidade de Medida</label>
              <select
                value={form.unidade_medida}
                onChange={(e) => setForm({ ...form, unidade_medida: e.target.value as 'UN' | 'G' })}
              >
                <option value="UN">UN - Unitário</option>
                <option value="G">G - Gramas</option>
              </select>
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
