'use client';

import { useEffect, useState, FormEvent } from 'react';
import { maskCNPJ, maskCPF } from '@/lib/masks';
import SearchBox from '../search-box';
import { IconEdit, IconCopy, IconTrash } from '../icons';

interface Empresa {
  codigo: number;
  documento: string;
  razao_social: string;
  tipo_pessoa: 'PJ' | 'PF';
}

const emptyForm = { documento: '', razao_social: '', tipo_pessoa: 'PJ' as Empresa['tipo_pessoa'] };

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const empresasFiltradas = empresas.filter((emp) => {
    const q = busca.toLowerCase();
    return (
      emp.razao_social.toLowerCase().includes(q) ||
      emp.documento.includes(q) ||
      (emp.tipo_pessoa === 'PJ' ? 'pessoa jurídica' : 'pessoa física').includes(q)
    );
  });

  async function load() {
    const res = await fetch('/api/empresas');
    if (res.ok) setEmpresas(await res.json());
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

  function startEdit(emp: Empresa) {
    setEditingCodigo(emp.codigo);
    setForm({ documento: emp.documento, razao_social: emp.razao_social, tipo_pessoa: emp.tipo_pessoa });
    setError('');
    setModalOpen(true);
  }

  function startCopy(emp: Empresa) {
    setEditingCodigo(null);
    setForm({ documento: '', razao_social: `${emp.razao_social} (cópia)`, tipo_pessoa: emp.tipo_pessoa });
    setError('');
    setModalOpen(true);
  }

  function cancelEdit() {
    setEditingCodigo(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(false);
  }

  function handleDocumentoChange(value: string) {
    const masked = form.tipo_pessoa === 'PJ' ? maskCNPJ(value) : maskCPF(value);
    setForm({ ...form, documento: masked });
  }

  function handleTipoChange(tipo: Empresa['tipo_pessoa']) {
    setForm({ ...form, tipo_pessoa: tipo, documento: '' });
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
    if (!confirm('Excluir este registro?')) return;
    const res = await fetch(`/api/empresas/${codigo}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Não foi possível excluir.');
      return;
    }
    load();
  }

  const isPJ = form.tipo_pessoa === 'PJ';

  return (
    <div>
      <div className="page-header">
        <h2>Cadastro de Empresas</h2>
        <button className="btn-primary" onClick={startNew} style={{ width: 'auto', padding: '10px 20px' }}>
          Novo Registro
        </button>
      </div>

      <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por nome, CNPJ/CPF ou tipo..." />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>CNPJ/CPF</th>
              <th>Razão Social/Nome</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {empresasFiltradas.map((emp) => (
              <tr key={emp.codigo}>
                <td>{emp.codigo}</td>
                <td>{emp.tipo_pessoa === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}</td>
                <td>{emp.tipo_pessoa === 'PJ' ? maskCNPJ(emp.documento) : maskCPF(emp.documento)}</td>
                <td>{emp.razao_social}</td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" title="Editar" onClick={() => startEdit(emp)}>
                      <IconEdit />
                    </button>
                    <button className="icon-btn" title="Copiar" onClick={() => startCopy(emp)}>
                      <IconCopy />
                    </button>
                    <button className="icon-btn danger" title="Excluir" onClick={() => handleDelete(emp.codigo)}>
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {empresasFiltradas.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhum registro encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCodigo ? 'Editar registro' : 'Novo registro'}</h3>
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
                    value={form.tipo_pessoa}
                    onChange={(e) => handleTipoChange(e.target.value as Empresa['tipo_pessoa'])}
                  >
                    <option value="PJ">Pessoa Jurídica (CNPJ)</option>
                    <option value="PF">Pessoa Física (CPF)</option>
                  </select>
                </div>
                <div className="field">
                  <label>{isPJ ? 'CNPJ' : 'CPF'}</label>
                  <input
                    placeholder={isPJ ? '00.000.000/0000-00' : '000.000.000-00'}
                    value={form.documento}
                    onChange={(e) => handleDocumentoChange(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>{isPJ ? 'Razão Social' : 'Nome'}</label>
                  <input
                    value={form.razao_social}
                    onChange={(e) => setForm({ ...form, razao_social: e.target.value.toUpperCase() })}
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
