'use client';

import { useEffect, useState, FormEvent } from 'react';
import SearchBox from '../search-box';
import { IconEdit, IconCheck, IconTrash } from '../icons';

interface ContaReceber {
  codigo: number;
  orcamento_codigo: number | null;
  cliente_codigo: number | null;
  cliente_nome: string | null;
  descricao: string;
  valor: string;
  data_vencimento: string;
  data_recebimento: string | null;
  status: 'ABERTO' | 'RECEBIDO' | 'CANCELADO';
  banco_codigo: number | null;
  codigo_banco: string | null;
  agencia: string | null;
  num_conta: string | null;
  banco_descricao: string | null;
}

interface Cliente {
  codigo: number;
  nome: string;
}

interface Banco {
  codigo: number;
  codigo_banco: string;
  agencia: string;
  num_conta: string;
  descricao: string | null;
}

const STATUS_LABELS: Record<ContaReceber['status'], string> = {
  ABERTO: 'Em Aberto',
  RECEBIDO: 'Recebido',
  CANCELADO: 'Cancelado',
};

const STATUS_BADGE_CLASS: Record<ContaReceber['status'], string> = {
  ABERTO: 'status-badge-blue',
  RECEBIDO: 'status-badge-green',
  CANCELADO: 'status-badge-red',
};

const emptyForm = {
  cliente_codigo: '',
  descricao: '',
  valor: '',
  data_vencimento: '',
  data_recebimento: '',
  status: 'ABERTO' as ContaReceber['status'],
  banco_codigo: '',
};

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function parseDecimal(value: string): number {
  return Number(String(value).trim().replace(',', '.'));
}

function bancoLabel(b: Banco) {
  return `${b.codigo_banco} — Ag. ${b.agencia} / CC ${b.num_conta}${b.descricao ? ` (${b.descricao})` : ''}`;
}

export default function ContasReceberPage() {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const [baixaConta, setBaixaConta] = useState<ContaReceber | null>(null);
  const [bancoBaixa, setBancoBaixa] = useState('');
  const [baixaErro, setBaixaErro] = useState('');
  const [baixando, setBaixando] = useState(false);

  const contasFiltradas = contas.filter((c) => {
    const q = busca.toLowerCase();
    return (
      c.descricao.toLowerCase().includes(q) || (c.cliente_nome || '').toLowerCase().includes(q)
    );
  });

  const totalAberto = contas
    .filter((c) => c.status === 'ABERTO')
    .reduce((soma, c) => soma + Number(c.valor), 0);

  async function load() {
    const [contasRes, cliRes, bancosRes] = await Promise.all([
      fetch('/api/contas-receber'),
      fetch('/api/clientes'),
      fetch('/api/bancos'),
    ]);
    if (contasRes.ok) setContas(await contasRes.json());
    if (cliRes.ok) setClientes(await cliRes.json());
    if (bancosRes.ok) setBancos(await bancosRes.json());
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

  function startEdit(c: ContaReceber) {
    setEditingCodigo(c.codigo);
    setForm({
      cliente_codigo: c.cliente_codigo ? String(c.cliente_codigo) : '',
      descricao: c.descricao,
      valor: c.valor,
      data_vencimento: c.data_vencimento.slice(0, 10),
      data_recebimento: c.data_recebimento ? c.data_recebimento.slice(0, 10) : '',
      status: c.status,
      banco_codigo: c.banco_codigo ? String(c.banco_codigo) : '',
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

    const valorNumero = parseDecimal(form.valor);
    if (Number.isNaN(valorNumero) || valorNumero <= 0) {
      setError('Informe um valor válido.');
      return;
    }
    if (form.status === 'RECEBIDO' && !form.banco_codigo) {
      setError('Selecione o banco em que o título foi baixado.');
      return;
    }

    setLoading(true);
    try {
      const url = editingCodigo ? `/api/contas-receber/${editingCodigo}` : '/api/contas-receber';
      const method = editingCodigo ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_codigo: form.cliente_codigo || null,
          descricao: form.descricao,
          valor: valorNumero.toFixed(2),
          data_vencimento: form.data_vencimento || hoje(),
          data_recebimento: form.data_recebimento || null,
          status: form.status,
          banco_codigo: form.banco_codigo || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Não foi possível salvar.');
        return;
      }
      cancelEdit();
      load();
    } finally {
      setLoading(false);
    }
  }

  function abrirBaixa(c: ContaReceber) {
    setBaixaConta(c);
    setBancoBaixa('');
    setBaixaErro('');
  }

  function fecharBaixa() {
    setBaixaConta(null);
    setBancoBaixa('');
    setBaixaErro('');
  }

  async function handleConfirmarBaixa() {
    if (!baixaConta) return;
    if (!bancoBaixa) {
      setBaixaErro('Selecione o banco em que o título será baixado.');
      return;
    }
    setBaixando(true);
    try {
      const res = await fetch(`/api/contas-receber/${baixaConta.codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: baixaConta.descricao,
          valor: baixaConta.valor,
          data_vencimento: baixaConta.data_vencimento.slice(0, 10),
          data_recebimento: hoje(),
          status: 'RECEBIDO',
          banco_codigo: bancoBaixa,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setBaixaErro(data.error || 'Não foi possível marcar como recebido.');
        return;
      }
      fecharBaixa();
      load();
    } finally {
      setBaixando(false);
    }
  }

  async function handleDelete(codigo: number) {
    if (!confirm('Excluir este título?')) return;
    const res = await fetch(`/api/contas-receber/${codigo}`, { method: 'DELETE' });
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
        <h2>Contas a Receber</h2>
        <button className="btn-primary" onClick={startNew} style={{ width: 'auto', padding: '10px 20px' }}>
          Novo Título
        </button>
      </div>

      <p className="hint" style={{ marginTop: -8, marginBottom: 16 }}>
        Total em aberto: R$ {totalAberto.toFixed(2)}
      </p>

      <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por cliente ou descrição..." />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Descrição</th>
              <th>Orçamento</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Recebimento</th>
              <th>Banco</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {contasFiltradas.map((c) => (
              <tr key={c.codigo}>
                <td>{c.codigo}</td>
                <td>{c.cliente_nome || '-'}</td>
                <td>{c.descricao}</td>
                <td>{c.orcamento_codigo ? `#${c.orcamento_codigo}` : '-'}</td>
                <td>R$ {c.valor}</td>
                <td>{new Date(c.data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td>
                  {c.data_recebimento
                    ? new Date(c.data_recebimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                    : '-'}
                </td>
                <td>{c.codigo_banco ? `${c.codigo_banco} — Ag. ${c.agencia}` : '-'}</td>
                <td>
                  <span className={`status-badge ${STATUS_BADGE_CLASS[c.status]}`}>
                    {STATUS_LABELS[c.status]}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" title="Editar" onClick={() => startEdit(c)}>
                      <IconEdit />
                    </button>
                    {c.status === 'ABERTO' && (
                      <button className="icon-btn" title="Marcar como Recebido" onClick={() => abrirBaixa(c)}>
                        <IconCheck />
                      </button>
                    )}
                    <button className="icon-btn danger" title="Excluir" onClick={() => handleDelete(c.codigo)}>
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {contasFiltradas.length === 0 && (
              <tr>
                <td colSpan={10}>Nenhum título encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCodigo ? 'Editar título' : 'Novo título'}</h3>
              <button type="button" className="modal-close" onClick={cancelEdit} aria-label="Fechar">
                ×
              </button>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label>Cliente</label>
                  <select
                    value={form.cliente_codigo}
                    onChange={(e) => setForm({ ...form, cliente_codigo: e.target.value })}
                  >
                    <option value="">Nenhum</option>
                    {clientes.map((cli) => (
                      <option key={cli.codigo} value={cli.codigo}>
                        {cli.nome}
                      </option>
                    ))}
                  </select>
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
                  <label>Valor (R$)</label>
                  <div className="input-prefix-group">
                    <span className="input-prefix">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.valor}
                      onChange={(e) => setForm({ ...form, valor: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Data de Vencimento</label>
                  <input
                    type="date"
                    value={form.data_vencimento || hoje()}
                    onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                    required
                  />
                </div>
                {editingCodigo && (
                  <>
                    <div className="field">
                      <label>Data de Recebimento</label>
                      <input
                        type="date"
                        value={form.data_recebimento}
                        onChange={(e) => setForm({ ...form, data_recebimento: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value as ContaReceber['status'] })}
                      >
                        <option value="ABERTO">Em Aberto</option>
                        <option value="RECEBIDO">Recebido</option>
                        <option value="CANCELADO">Cancelado</option>
                      </select>
                    </div>
                    {form.status === 'RECEBIDO' && (
                      <div className="field">
                        <label>Banco da Baixa</label>
                        <select
                          value={form.banco_codigo}
                          onChange={(e) => setForm({ ...form, banco_codigo: e.target.value })}
                          required
                        >
                          <option value="" disabled>
                            Selecione...
                          </option>
                          {bancos.map((b) => (
                            <option key={b.codigo} value={b.codigo}>
                              {bancoLabel(b)}
                            </option>
                          ))}
                        </select>
                        {bancos.length === 0 && (
                          <p className="hint">Cadastre um banco em Configurações → Cadastro de Banco.</p>
                        )}
                      </div>
                    )}
                  </>
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

      {baixaConta && (
        <div className="modal-overlay" onClick={fecharBaixa}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Baixar Título</h3>
              <button type="button" className="modal-close" onClick={fecharBaixa} aria-label="Fechar">
                ×
              </button>
            </div>
            <p className="hint" style={{ marginTop: -8 }}>
              {baixaConta.descricao} — R$ {baixaConta.valor}
            </p>
            {baixaErro && <div className="error-msg">{baixaErro}</div>}
            <div className="field">
              <label>Banco em que será baixado</label>
              <select value={bancoBaixa} onChange={(e) => setBancoBaixa(e.target.value)} required>
                <option value="" disabled>
                  Selecione...
                </option>
                {bancos.map((b) => (
                  <option key={b.codigo} value={b.codigo}>
                    {bancoLabel(b)}
                  </option>
                ))}
              </select>
              {bancos.length === 0 && (
                <p className="hint">Cadastre um banco em Configurações → Cadastro de Banco.</p>
              )}
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button
                className="btn-primary"
                type="button"
                disabled={baixando}
                onClick={handleConfirmarBaixa}
                style={{ width: 'auto', padding: '10px 20px' }}
              >
                {baixando ? 'Baixando...' : 'Confirmar Baixa'}
              </button>
              <button type="button" className="btn-small" onClick={fecharBaixa}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
