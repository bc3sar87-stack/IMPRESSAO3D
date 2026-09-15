'use client';

import { useEffect, useState, FormEvent } from 'react';

interface Usuario {
  codigo: number;
  nome: string;
  email: string;
  cpf: string;
  nivel: 'USUARIO' | 'ADMINISTRADOR';
}

interface UsuarioForm {
  nome: string;
  email: string;
  cpf: string;
  nivel: Usuario['nivel'];
  senha: string;
}

const emptyForm: UsuarioForm = { nome: '', email: '', cpf: '', nivel: 'USUARIO', senha: '' };

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [form, setForm] = useState<UsuarioForm>(emptyForm);
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch('/api/usuarios');
    if (res.ok) setUsuarios(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(u: Usuario) {
    setEditingCodigo(u.codigo);
    setForm({ nome: u.nome, email: u.email, cpf: u.cpf, nivel: u.nivel, senha: '' });
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
      const url = editingCodigo ? `/api/usuarios/${editingCodigo}` : '/api/usuarios';
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
    if (!confirm('Excluir este usuário?')) return;
    const res = await fetch(`/api/usuarios/${codigo}`, { method: 'DELETE' });
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
        <h2>Cadastro de Usuários</h2>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>E-mail</th>
              <th>CPF</th>
              <th>Nível</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.codigo}>
                <td>{u.codigo}</td>
                <td>{u.nome}</td>
                <td>{u.email}</td>
                <td>{u.cpf}</td>
                <td>{u.nivel}</td>
                <td>
                  <button className="btn-small" onClick={() => startEdit(u)}>
                    Editar
                  </button>
                  <button className="btn-small danger" onClick={() => handleDelete(u.codigo)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={6}>Nenhum usuário cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{editingCodigo ? 'Editar usuário' : 'Novo usuário'}</h3>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Nome</label>
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>CPF</label>
              <input
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Nível</label>
              <select
                value={form.nivel}
                onChange={(e) => setForm({ ...form, nivel: e.target.value as Usuario['nivel'] })}
              >
                <option value="USUARIO">USUARIO</option>
                <option value="ADMINISTRADOR">ADMINISTRADOR</option>
              </select>
            </div>
            <div className="field">
              <label>{editingCodigo ? 'Nova senha (opcional)' : 'Senha'}</label>
              <input
                type="password"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                required={!editingCodigo}
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
