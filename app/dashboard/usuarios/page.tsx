'use client';

import { useEffect, useState, FormEvent } from 'react';
import { maskCPF } from '@/lib/masks';
import SearchBox from '../search-box';
import { IconEdit, IconCopy, IconTrash, IconCheck, IconMail } from '../icons';

interface Usuario {
  codigo: number;
  nome: string;
  email: string;
  cpf: string;
  nivel: 'USUARIO' | 'ADMINISTRADOR';
  tem_senha: boolean;
  ativo: boolean;
}

interface UsuarioForm {
  nome: string;
  email: string;
  cpf: string;
  nivel: Usuario['nivel'];
  senha: string;
  ativo: boolean;
}

const emptyForm: UsuarioForm = { nome: '', email: '', cpf: '', nivel: 'USUARIO', senha: '', ativo: true };

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [form, setForm] = useState<UsuarioForm>(emptyForm);
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendingCodigo, setResendingCodigo] = useState<number | null>(null);
  const [aprovandoCodigo, setAprovandoCodigo] = useState<number | null>(null);
  const [busca, setBusca] = useState('');

  const usuariosFiltrados = usuarios.filter((u) => {
    const q = busca.toLowerCase();
    return (
      u.nome.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.cpf.includes(q) ||
      u.nivel.toLowerCase().includes(q)
    );
  });

  async function load() {
    const res = await fetch('/api/usuarios');
    if (res.ok) setUsuarios(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setEditingCodigo(null);
    setForm(emptyForm);
    setError('');
    setInfo('');
    setModalOpen(true);
  }

  function startEdit(u: Usuario) {
    setEditingCodigo(u.codigo);
    setForm({ nome: u.nome, email: u.email, cpf: maskCPF(u.cpf), nivel: u.nivel, senha: '', ativo: u.ativo });
    setError('');
    setInfo('');
    setModalOpen(true);
  }

  function startCopy(u: Usuario) {
    setEditingCodigo(null);
    setForm({ nome: `${u.nome} (cópia)`, email: '', cpf: '', nivel: u.nivel, senha: '', ativo: true });
    setError('');
    setInfo('');
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
    setInfo('');
    setLoading(true);
    try {
      const url = editingCodigo ? `/api/usuarios/${editingCodigo}` : '/api/usuarios';
      const method = editingCodigo ? 'PUT' : 'POST';
      const body: Partial<UsuarioForm> = { ...form };
      if (editingCodigo && !form.senha) delete body.senha;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Não foi possível salvar.');
        return;
      }
      if (!editingCodigo) {
        if (data.convite_enviado) {
          setInfo('Usuário criado. Um e-mail foi enviado para ele definir a senha.');
        } else {
          setInfo(
            `Usuário criado, mas o e-mail de convite não pôde ser enviado (${data.convite_erro || 'erro desconhecido'}). Use "Reenviar convite" na lista depois de configurar o e-mail.`
          );
        }
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

  async function handleAprovar(codigo: number) {
    setAprovandoCodigo(codigo);
    setError('');
    setInfo('');
    try {
      const res = await fetch(`/api/usuarios/${codigo}/aprovar`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Não foi possível aprovar.');
        return;
      }
      setInfo('Usuário aprovado. Ele já pode acessar o sistema.');
      load();
    } finally {
      setAprovandoCodigo(null);
    }
  }

  async function handleResend(codigo: number) {
    setResendingCodigo(codigo);
    setError('');
    setInfo('');
    try {
      const res = await fetch(`/api/usuarios/${codigo}/reenviar-convite`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Não foi possível reenviar o convite.');
        return;
      }
      setInfo('Convite reenviado.');
    } finally {
      setResendingCodigo(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Cadastro de Usuários</h2>
        <button className="btn-primary" onClick={startNew} style={{ width: 'auto', padding: '10px 20px' }}>
          Novo Usuário
        </button>
      </div>

      {info && <div className="success-msg">{info}</div>}

      <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por nome, e-mail, CPF ou nível..." />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>E-mail</th>
              <th>CPF</th>
              <th>Nível</th>
              <th>Senha</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.map((u) => (
              <tr key={u.codigo}>
                <td>{u.codigo}</td>
                <td>{u.nome}</td>
                <td>{u.email}</td>
                <td>{maskCPF(u.cpf)}</td>
                <td>{u.nivel}</td>
                <td>{u.tem_senha ? 'Definida' : 'Pendente'}</td>
                <td>
                  <span className={`status-badge ${u.ativo ? 'status-badge-green' : 'status-badge-orange'}`}>
                    {u.ativo ? 'Ativo' : 'Aguardando aprovação'}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" title="Editar" onClick={() => startEdit(u)}>
                      <IconEdit />
                    </button>
                    <button className="icon-btn" title="Copiar" onClick={() => startCopy(u)}>
                      <IconCopy />
                    </button>
                    {!u.ativo && (
                      <button
                        className="icon-btn"
                        title="Aprovar"
                        onClick={() => handleAprovar(u.codigo)}
                        disabled={aprovandoCodigo === u.codigo}
                      >
                        <IconCheck />
                      </button>
                    )}
                    {!u.tem_senha && (
                      <button
                        className="icon-btn"
                        title="Reenviar convite"
                        onClick={() => handleResend(u.codigo)}
                        disabled={resendingCodigo === u.codigo}
                      >
                        <IconMail />
                      </button>
                    )}
                    <button className="icon-btn danger" title="Excluir" onClick={() => handleDelete(u.codigo)}>
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {usuariosFiltrados.length === 0 && (
              <tr>
                <td colSpan={8}>Nenhum usuário encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCodigo ? 'Editar usuário' : 'Novo usuário'}</h3>
              <button type="button" className="modal-close" onClick={cancelEdit} aria-label="Fechar">
                ×
              </button>
            </div>
            {error && <div className="error-msg">{error}</div>}
            {!editingCodigo && (
              <p className="hint" style={{ marginTop: -8, marginBottom: 16 }}>
                O usuário recebe um e-mail com um link para definir a própria senha.
              </p>
            )}
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
                    onChange={(e) => setForm({ ...form, cpf: maskCPF(e.target.value) })}
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
                {editingCodigo && (
                  <div className="field">
                    <label>Nova senha (opcional)</label>
                    <input
                      type="password"
                      value={form.senha}
                      onChange={(e) => setForm({ ...form, senha: e.target.value })}
                    />
                    <p className="hint">Deixe em branco para não alterar.</p>
                  </div>
                )}
                {editingCodigo && (
                  <div className="field">
                    <label>Status</label>
                    <label className="checklist-item">
                      <input
                        type="checkbox"
                        checked={form.ativo}
                        onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                      />
                      Ativo (desmarque para bloquear o acesso)
                    </label>
                  </div>
                )}
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
