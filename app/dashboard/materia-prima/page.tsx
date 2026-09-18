'use client';

import { useEffect, useState, FormEvent } from 'react';
import SearchBox from '../search-box';
import { IconEdit, IconCopy, IconTrash } from '../icons';

interface MateriaPrima {
  codigo: number;
  tipo_codigo: number;
  tipo_nome: string;
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
  descricao: '',
  cor_hex: '#cccccc',
  unidade_medida_codigo: '',
  fornecedor: '',
  valor_custo: '',
};

const emptyNovoLote = {
  marca: '',
  fornecedor: '',
  valor_custo: '',
  quantidade_inicial: '',
  data_compra: '',
  observacao: '',
  temp_mesa_min: '',
  temp_mesa_max: '',
  temp_impressao_min: '',
  temp_impressao_max: '',
};

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export default function MateriaPrimaPage() {
  const [itens, setItens] = useState<MateriaPrima[]>([]);
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const [novoLoteAlvo, setNovoLoteAlvo] = useState<{ codigo: number; descricao: string; unidade_medida_sigla: string } | null>(
    null
  );
  const [novoLoteForm, setNovoLoteForm] = useState(emptyNovoLote);
  const [salvandoLote, setSalvandoLote] = useState(false);
  const [loteError, setLoteError] = useState('');

  const itensFiltrados = itens.filter((item) => {
    const q = busca.toLowerCase();
    return (
      item.tipo_nome.toLowerCase().includes(q) ||
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

  function startNew() {
    setEditingCodigo(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  }

  function startEdit(item: MateriaPrima) {
    setEditingCodigo(item.codigo);
    setForm({
      tipo_codigo: String(item.tipo_codigo),
      descricao: item.descricao,
      cor_hex: item.cor_hex,
      unidade_medida_codigo: String(item.unidade_medida_codigo),
      fornecedor: item.fornecedor || '',
      valor_custo: item.valor_custo || '',
    });
    setError('');
    setModalOpen(true);
  }

  function startCopy(item: MateriaPrima) {
    setEditingCodigo(null);
    setForm({
      tipo_codigo: String(item.tipo_codigo),
      descricao: `${item.descricao} (cópia)`,
      cor_hex: item.cor_hex,
      unidade_medida_codigo: String(item.unidade_medida_codigo),
      fornecedor: item.fornecedor || '',
      valor_custo: item.valor_custo || '',
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
      const url = editingCodigo ? `/api/materia-prima/${editingCodigo}` : '/api/materia-prima';
      const method = editingCodigo ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, cor: form.descricao }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Não foi possível salvar.');
        return;
      }
      const criandoNova = !editingCodigo;
      const unidade = unidades.find((u) => String(u.codigo) === form.unidade_medida_codigo);
      cancelEdit();
      await load();
      if (criandoNova && confirm('Matéria prima cadastrada! Deseja já cadastrar um lote de estoque?')) {
        setNovoLoteForm(emptyNovoLote);
        setLoteError('');
        setNovoLoteAlvo({
          codigo: data.codigo,
          descricao: form.descricao,
          unidade_medida_sigla: unidade?.sigla || '',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCriarLote(e: FormEvent) {
    e.preventDefault();
    if (!novoLoteAlvo) return;
    setLoteError('');
    setSalvandoLote(true);
    try {
      const res = await fetch(`/api/estoque/${novoLoteAlvo.codigo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoLoteForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoteError(data.error || 'Não foi possível criar o lote.');
        return;
      }
      setNovoLoteAlvo(null);
      setNovoLoteForm(emptyNovoLote);
    } finally {
      setSalvandoLote(false);
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
        <button className="btn-primary" onClick={startNew} style={{ width: 'auto', padding: '10px 20px' }}>
          Nova Matéria Prima
        </button>
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

      <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por tipo, cor ou descrição..." />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>Descrição / Cor</th>
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
                <td>
                  <span className="color-swatch" style={{ backgroundColor: item.cor_hex }} />
                  {item.descricao}
                </td>
                <td>{item.unidade_medida_nome}</td>
                <td>{item.fornecedor || '-'}</td>
                <td>{item.valor_custo ? `R$ ${item.valor_custo}/Kg` : '-'}</td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" title="Editar" onClick={() => startEdit(item)}>
                      <IconEdit />
                    </button>
                    <button className="icon-btn" title="Copiar" onClick={() => startCopy(item)}>
                      <IconCopy />
                    </button>
                    <button className="icon-btn danger" title="Excluir" onClick={() => handleDelete(item.codigo)}>
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {itensFiltrados.length === 0 && (
              <tr>
                <td colSpan={7}>Nenhuma matéria prima encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCodigo ? 'Editar matéria prima' : 'Nova matéria prima'}</h3>
              <button type="button" className="modal-close" onClick={cancelEdit} aria-label="Fechar">
                ×
              </button>
            </div>
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
                  <label>Descrição (nome da cor)</label>
                  <div className="color-field">
                    <input
                      type="color"
                      className="color-picker"
                      value={form.cor_hex}
                      onChange={(e) => setForm({ ...form, cor_hex: e.target.value })}
                    />
                    <input
                      value={form.descricao}
                      onChange={(e) => setForm({ ...form, descricao: e.target.value.toUpperCase() })}
                      placeholder="Ex.: PRETO, VERMELHO FOSCO..."
                      required
                    />
                  </div>
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
                    onChange={(e) => setForm({ ...form, fornecedor: e.target.value.toUpperCase() })}
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
                <button type="button" className="btn-small" onClick={cancelEdit}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {novoLoteAlvo && (
        <div className="modal-overlay" onClick={() => setNovoLoteAlvo(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Novo Lote — {novoLoteAlvo.descricao}</h3>
              <button type="button" className="modal-close" onClick={() => setNovoLoteAlvo(null)} aria-label="Fechar">
                ×
              </button>
            </div>
            {loteError && <div className="error-msg">{loteError}</div>}
            <form onSubmit={handleCriarLote}>
              <div className="form-grid">
                <div className="field">
                  <label>Marca</label>
                  <input
                    value={novoLoteForm.marca}
                    onChange={(e) => setNovoLoteForm({ ...novoLoteForm, marca: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="field">
                  <label>Fornecedor</label>
                  <input
                    value={novoLoteForm.fornecedor}
                    onChange={(e) => setNovoLoteForm({ ...novoLoteForm, fornecedor: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="field">
                  <label>Custo (R$/{novoLoteAlvo.unidade_medida_sigla})</label>
                  <div className="input-prefix-group">
                    <span className="input-prefix">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={novoLoteForm.valor_custo}
                      onChange={(e) => setNovoLoteForm({ ...novoLoteForm, valor_custo: e.target.value })}
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Quantidade inicial ({novoLoteAlvo.unidade_medida_sigla})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={novoLoteForm.quantidade_inicial}
                    onChange={(e) => setNovoLoteForm({ ...novoLoteForm, quantidade_inicial: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Data da Compra</label>
                  <input
                    type="date"
                    value={novoLoteForm.data_compra || hoje()}
                    onChange={(e) => setNovoLoteForm({ ...novoLoteForm, data_compra: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Observação</label>
                  <input
                    value={novoLoteForm.observacao}
                    onChange={(e) => setNovoLoteForm({ ...novoLoteForm, observacao: e.target.value.toUpperCase() })}
                    placeholder="Nº da nota fiscal, etc."
                  />
                </div>
                <div className="field">
                  <label>Temp. Mesa Mínimo (°C)</label>
                  <input
                    type="number"
                    value={novoLoteForm.temp_mesa_min}
                    onChange={(e) => setNovoLoteForm({ ...novoLoteForm, temp_mesa_min: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Temp. Mesa Máximo (°C)</label>
                  <input
                    type="number"
                    value={novoLoteForm.temp_mesa_max}
                    onChange={(e) => setNovoLoteForm({ ...novoLoteForm, temp_mesa_max: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Temp. Impressão Mínimo (°C)</label>
                  <input
                    type="number"
                    value={novoLoteForm.temp_impressao_min}
                    onChange={(e) => setNovoLoteForm({ ...novoLoteForm, temp_impressao_min: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Temp. Impressão Máximo (°C)</label>
                  <input
                    type="number"
                    value={novoLoteForm.temp_impressao_max}
                    onChange={(e) => setNovoLoteForm({ ...novoLoteForm, temp_impressao_max: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button className="btn-primary" type="submit" disabled={salvandoLote} style={{ width: 'auto', padding: '10px 20px' }}>
                  {salvandoLote ? 'Salvando...' : 'Criar Lote'}
                </button>
                <button type="button" className="btn-small" onClick={() => setNovoLoteAlvo(null)}>
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
