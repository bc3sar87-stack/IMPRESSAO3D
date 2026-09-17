'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import SearchBox from '../search-box';
import { IconEdit, IconTrash } from '../icons';

interface Movimentacao {
  codigo: number;
  tipo: 'ENTRADA' | 'SAIDA';
  descricao: string;
  valor: string;
  data_movimento: string;
  origem: 'MANUAL' | 'CONTA_RECEBER' | 'CONTA_PAGAR';
  referencia_codigo: number | null;
  banco_codigo: number | null;
  codigo_banco: string | null;
  agencia: string | null;
  num_conta: string | null;
  banco_descricao: string | null;
}

interface Banco {
  codigo: number;
  codigo_banco: string;
  agencia: string;
  num_conta: string;
  descricao: string | null;
}

const ORIGEM_LABELS: Record<Movimentacao['origem'], string> = {
  MANUAL: 'Manual',
  CONTA_RECEBER: 'Conta a Receber',
  CONTA_PAGAR: 'Conta a Pagar',
};

const emptyForm = {
  tipo: 'ENTRADA' as Movimentacao['tipo'],
  descricao: '',
  valor: '',
  data_movimento: '',
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

export default function MovimentacaoFinanceiraPage() {
  const [movimentos, setMovimentos] = useState<Movimentacao[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'ENTRADA' | 'SAIDA'>('TODOS');
  const [filtroBanco, setFiltroBanco] = useState('');
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');

  async function load() {
    const [movRes, bancosRes] = await Promise.all([
      fetch('/api/movimentacoes-financeiras'),
      fetch('/api/bancos'),
    ]);
    if (movRes.ok) setMovimentos(await movRes.json());
    if (bancosRes.ok) setBancos(await bancosRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  const movimentosFiltrados = useMemo(() => {
    const q = busca.toLowerCase();
    return movimentos.filter((m) => {
      if (filtroTipo !== 'TODOS' && m.tipo !== filtroTipo) return false;
      if (filtroBanco && String(m.banco_codigo) !== filtroBanco) return false;
      if (filtroInicio && m.data_movimento.slice(0, 10) < filtroInicio) return false;
      if (filtroFim && m.data_movimento.slice(0, 10) > filtroFim) return false;
      if (q && !m.descricao.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [movimentos, filtroTipo, filtroBanco, filtroInicio, filtroFim, busca]);

  const totalEntradas = movimentosFiltrados
    .filter((m) => m.tipo === 'ENTRADA')
    .reduce((soma, m) => soma + Number(m.valor), 0);
  const totalSaidas = movimentosFiltrados
    .filter((m) => m.tipo === 'SAIDA')
    .reduce((soma, m) => soma + Number(m.valor), 0);
  const saldo = totalEntradas - totalSaidas;

  function startNew() {
    setEditingCodigo(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  }

  function startEdit(m: Movimentacao) {
    if (m.origem !== 'MANUAL') return;
    setEditingCodigo(m.codigo);
    setForm({
      tipo: m.tipo,
      descricao: m.descricao,
      valor: m.valor,
      data_movimento: m.data_movimento.slice(0, 10),
      banco_codigo: m.banco_codigo ? String(m.banco_codigo) : '',
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

    setLoading(true);
    try {
      const url = editingCodigo ? `/api/movimentacoes-financeiras/${editingCodigo}` : '/api/movimentacoes-financeiras';
      const method = editingCodigo ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: form.tipo,
          descricao: form.descricao,
          valor: valorNumero.toFixed(2),
          data_movimento: form.data_movimento || hoje(),
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

  async function handleDelete(m: Movimentacao) {
    if (m.origem !== 'MANUAL') return;
    if (!confirm('Excluir este lançamento?')) return;
    const res = await fetch(`/api/movimentacoes-financeiras/${m.codigo}`, { method: 'DELETE' });
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
        <h2>Movimentação Financeira</h2>
        <button className="btn-primary" onClick={startNew} style={{ width: 'auto', padding: '10px 20px' }}>
          Novo Lançamento
        </button>
      </div>

      <div className="fin-summary" style={{ marginBottom: 16 }}>
        <div className="fin-summary-item">
          <span>Total Entradas</span>
          <strong style={{ color: '#16a34a' }}>R$ {totalEntradas.toFixed(2)}</strong>
        </div>
        <div className="fin-summary-item">
          <span>Total Saídas</span>
          <strong style={{ color: '#dc2626' }}>R$ {totalSaidas.toFixed(2)}</strong>
        </div>
        <div className="fin-summary-item">
          <span>Saldo</span>
          <strong style={{ color: saldo >= 0 ? '#16a34a' : '#dc2626' }}>R$ {saldo.toFixed(2)}</strong>
        </div>
      </div>

      <div className="form-grid" style={{ marginBottom: 12 }}>
        <div className="field">
          <label>Tipo</label>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as typeof filtroTipo)}>
            <option value="TODOS">Todos</option>
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA">Saída</option>
          </select>
        </div>
        <div className="field">
          <label>Banco</label>
          <select value={filtroBanco} onChange={(e) => setFiltroBanco(e.target.value)}>
            <option value="">Todos</option>
            {bancos.map((b) => (
              <option key={b.codigo} value={b.codigo}>
                {bancoLabel(b)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>De</label>
          <input type="date" value={filtroInicio} onChange={(e) => setFiltroInicio(e.target.value)} />
        </div>
        <div className="field">
          <label>Até</label>
          <input type="date" value={filtroFim} onChange={(e) => setFiltroFim(e.target.value)} />
        </div>
      </div>

      <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por descrição..." />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Banco</th>
              <th>Origem</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {movimentosFiltrados.map((m) => (
              <tr key={m.codigo}>
                <td>{new Date(m.data_movimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td>
                  <span className={`status-badge ${m.tipo === 'ENTRADA' ? 'status-badge-green' : 'status-badge-red'}`}>
                    {m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                  </span>
                </td>
                <td>{m.descricao}</td>
                <td>R$ {m.valor}</td>
                <td>{m.codigo_banco ? `${m.codigo_banco} — Ag. ${m.agencia}` : '-'}</td>
                <td>
                  <span className={`status-badge ${m.origem === 'MANUAL' ? 'status-badge-gray' : 'status-badge-blue'}`}>
                    {ORIGEM_LABELS[m.origem]}
                  </span>
                </td>
                <td>
                  {m.origem === 'MANUAL' && (
                    <div className="row-actions">
                      <button className="icon-btn" title="Editar" onClick={() => startEdit(m)}>
                        <IconEdit />
                      </button>
                      <button className="icon-btn danger" title="Excluir" onClick={() => handleDelete(m)}>
                        <IconTrash />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {movimentosFiltrados.length === 0 && (
              <tr>
                <td colSpan={7}>Nenhum movimento encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCodigo ? 'Editar lançamento' : 'Novo lançamento'}</h3>
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
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value as Movimentacao['tipo'] })}
                  >
                    <option value="ENTRADA">Entrada</option>
                    <option value="SAIDA">Saída</option>
                  </select>
                </div>
                <div className="field">
                  <label>Descrição</label>
                  <input
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value.toUpperCase() })}
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
                  <label>Data</label>
                  <input
                    type="date"
                    value={form.data_movimento || hoje()}
                    onChange={(e) => setForm({ ...form, data_movimento: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Banco (opcional)</label>
                  <select
                    value={form.banco_codigo}
                    onChange={(e) => setForm({ ...form, banco_codigo: e.target.value })}
                  >
                    <option value="">Não informado</option>
                    {bancos.map((b) => (
                      <option key={b.codigo} value={b.codigo}>
                        {bancoLabel(b)}
                      </option>
                    ))}
                  </select>
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
