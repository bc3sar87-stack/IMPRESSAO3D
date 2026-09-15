'use client';

import { useEffect, useState, FormEvent } from 'react';
import SearchBox from '../search-box';

interface MateriaPrima {
  codigo: number;
  tipo_codigo: number;
  tipo_nome: string;
  marca: string;
  descricao: string;
  cor: string;
  cor_hex: string;
  unidade_medida_codigo: number;
  unidade_medida_sigla: string;
  unidade_medida_nome: string;
  fornecedor: string | null;
  valor_custo: string | null;
}

interface Tipo {
  codigo: number;
  nome: string;
}

interface Unidade {
  codigo: number;
  sigla: string;
  nome: string;
}

const emptyForm = {
  tipo_codigo: '',
  marca: '',
  descricao: '',
  cor: '',
  cor_hex: '#cccccc',
  unidade_medida_codigo: '',
  fornecedor: '',
  valor_custo: '',
};

export default function MateriaPrimaPage() {
  const [itens, setItens] = useState<MateriaPrima[]>([]);
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const itensFiltrados = itens.filter((item) => {
    const q = busca.toLowerCase();
    return (
      item.tipo_nome.toLowerCase().includes(q) ||
      item.marca.toLowerCase().includes(q) ||
      item.descricao.toLowerCase().includes(q) ||
      item.cor.toLowerCase().includes(q) ||
      (item.fornecedor || '').toLowerCase().includes(q)
    );
  });

  async function load() {
    const [itensRes, tiposRes, unidadesRes] = await Promise.all([
      fetch('/api/materia-prima'),
      fetch('/api/tipos-materia-prima'),
      fetch('/api/unidades-medida'),
    ]);
    if (itensRes.ok) setItens(await itensRes.json());
    if (tiposRes.ok) setTipos(await tiposRes.json());
    if (unidadesRes.ok) setUnidades(await unidadesRes.json());
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
      cor_hex: item.cor_hex,
      unidade_medida_codigo: String(item.unidade_medida_codigo),
      fornecedor: item.fornecedor || '',
      valor_custo: item.valor_custo || '',
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
      {unidades.length === 0 && (
        <div className="error-msg">
          Cadastre pelo menos uma Unidade de Medida (em Cadastros → Cadastro de Unidade de Medida)
          antes de criar uma matéria prima.
        </div>
      )}

      <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por tipo, marca, cor ou descrição..." />

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
              <th>Fornecedor</th>
              <th>Valor Custo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itensFiltrados.map((item) => (
              <tr key={item.codigo}>
                <td>{item.codigo}</td>
                <td>{item.tipo_nome}</td>
                <td>{item.marca}</td>
                <td>{item.descricao}</td>
                <td>
                  <span className="color-swatch" style={{ backgroundColor: item.cor_hex }} />
                  {item.cor}
                </td>
                <td>{item.unidade_medida_nome}</td>
                <td>{item.fornecedor || '-'}</td>
                <td>{item.valor_custo ? `R$ ${item.valor_custo}/Kg` : '-'}</td>
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
            {itensFiltrados.length === 0 && (
              <tr>
                <td colSpan={9}>Nenhuma matéria prima encontrada.</td>
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
              <div className="color-field">
                <input
                  type="color"
                  className="color-picker"
                  value={form.cor_hex}
                  onChange={(e) => setForm({ ...form, cor_hex: e.target.value })}
                />
                <input
                  value={form.cor}
                  onChange={(e) => setForm({ ...form, cor: e.target.value })}
                  placeholder="Nome da cor"
                  required
                />
              </div>
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
                value={form.unidade_medida_codigo}
                onChange={(e) => setForm({ ...form, unidade_medida_codigo: e.target.value })}
                required
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {unidades.map((u) => (
                  <option key={u.codigo} value={u.codigo}>
                    {u.sigla} - {u.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Fornecedor</label>
              <input
                value={form.fornecedor}
                onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Valor Custo (R$/Kg)</label>
              <div className="input-prefix-group">
                <span className="input-prefix">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor_custo}
                  onChange={(e) => setForm({ ...form, valor_custo: e.target.value })}
                />
              </div>
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
