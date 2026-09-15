'use client';

import { useEffect, useState, FormEvent } from 'react';
import { maskCNPJ, maskCPF, maskTelefone } from '@/lib/masks';
import SearchBox from '../search-box';

interface Cliente {
  codigo: number;
  tipo_pessoa: 'PJ' | 'PF';
  documento: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
}

const emptyForm = {
  tipo_pessoa: 'PF' as Cliente['tipo_pessoa'],
  documento: '',
  nome: '',
  telefone: '',
  email: '',
  endereco: '',
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const clientesFiltrados = clientes.filter((c) => {
    const q = busca.toLowerCase();
    return (
      c.nome.toLowerCase().includes(q) ||
      c.documento.includes(q) ||
      (c.telefone || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  async function load() {
    const res = await fetch('/api/clientes');
    if (res.ok) setClientes(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(c: Cliente) {
    setEditingCodigo(c.codigo);
    setForm({
      tipo_pessoa: c.tipo_pessoa,
      documento: c.documento,
      nome: c.nome,
      telefone: c.telefone || '',
      email: c.email || '',
      endereco: c.endereco || '',
    });
    setError('');
  }

  function cancelEdit() {
    setEditingCodigo(null);
    setForm(emptyForm);
    setError('');
  }

  function handleDocumentoChange(value: string) {
    const masked = form.tipo_pessoa === 'PJ' ? maskCNPJ(value) : maskCPF(value);
    setForm({ ...form, documento: masked });
  }

  function handleTipoChange(tipo: Cliente['tipo_pessoa']) {
    setForm({ ...form, tipo_pessoa: tipo, documento: '' });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = editingCodigo ? `/api/clientes/${editingCodigo}` : '/api/clientes';
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
    if (!confirm('Excluir este cliente?')) return;
    const res = await fetch(`/api/clientes/${codigo}`, { method: 'DELETE' });
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
        <h2>Cadastro de Clientes</h2>
      </div>

      <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por nome, documento, telefone ou e-mail..." />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>CNPJ/CPF</th>
              <th>Telefone</th>
              <th>E-mail</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map((c) => (
              <tr key={c.codigo}>
                <td>{c.codigo}</td>
                <td>{c.nome}</td>
                <td>{c.tipo_pessoa === 'PJ' ? maskCNPJ(c.documento) : maskCPF(c.documento)}</td>
                <td>{c.telefone ? maskTelefone(c.telefone) : '-'}</td>
                <td>{c.email || '-'}</td>
                <td>
                  <button className="btn-small" onClick={() => startEdit(c)}>
                    Editar
                  </button>
                  <button className="btn-small danger" onClick={() => handleDelete(c.codigo)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {clientesFiltrados.length === 0 && (
              <tr>
                <td colSpan={6}>Nenhum cliente encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{editingCodigo ? 'Editar cliente' : 'Novo cliente'}</h3>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Tipo</label>
              <select
                value={form.tipo_pessoa}
                onChange={(e) => handleTipoChange(e.target.value as Cliente['tipo_pessoa'])}
              >
                <option value="PF">Pessoa Física (CPF)</option>
                <option value="PJ">Pessoa Jurídica (CNPJ)</option>
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
              <label>Nome</label>
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Telefone</label>
              <input
                placeholder="(00) 00000-0000"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: maskTelefone(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Endereço</label>
              <input
                value={form.endereco}
                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
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
