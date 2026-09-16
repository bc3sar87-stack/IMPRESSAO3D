'use client';

import { useEffect, useState, FormEvent } from 'react';
import SearchBox from '../search-box';
import { IconEdit, IconCheck, IconTrash } from '../icons';

interface ContaPagar {
  codigo: number;
  fornecedor: string | null;
  descricao: string;
  valor: string;
  data_vencimento: string;
  data_pagamento: string | null;
  status: 'ABERTO' | 'PAGO' | 'CANCELADO';
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

const STATUS_LABELS: Record<ContaPagar['status'], string> = {
  ABERTO: 'Em Aberto',
  PAGO: 'Pago',
  CANCELADO: 'Cancelado',
};

const STATUS_BADGE_CLASS: Record<ContaPagar['status'], string> = {
  ABERTO: 'status-badge-orange',
  PAGO: 'status-badge-green',
  CANCELADO: 'status-badge-red',
};

const emptyForm = {
  fornecedor: '',
  descricao: '',
  valor: '',
  data_vencimento: '',
  data_pagamento: '',
  status: 'ABERTO' as ContaPagar['status'],
  banco_codigo: '',
};

interface ParcelaForm {
  valor: string;
  data_vencimento: string;
}

function novaParcela(): ParcelaForm {
  return { valor: '', data_vencimento: '' };
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function addMeses(dataBase: string, meses: number): string {
  const d = new Date(dataBase + 'T00:00:00');
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

function parseDecimal(value: string): number {
  return Number(String(value).trim().replace(',', '.'));
}

function bancoLabel(b: Banco) {
  return `${b.codigo_banco} — Ag. ${b.agencia} / CC ${b.num_conta}${b.descricao ? ` (${b.descricao})` : ''}`;
}

export default function ContasPagarPage() {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const [parcelado, setParcelado] = useState(false);
  const [parcelas, setParcelas] = useState<ParcelaForm[]>([novaParcela(), novaParcela()]);

  const [baixaConta, setBaixaConta] = useState<ContaPagar | null>(null);
  const [bancoBaixa, setBancoBaixa] = useState('');
  const [baixaErro, setBaixaErro] = useState('');
  const [baixando, setBaixando] = useState(false);

  const contasFiltradas = contas.filter((c) => {
    const q = busca.toLowerCase();
    return (
      c.descricao.toLowerCase().includes(q) || (c.fornecedor || '').toLowerCase().includes(q)
    );
  });

  const totalAberto = contas
    .filter((c) => c.status === 'ABERTO')
    .reduce((soma, c) => soma + Number(c.valor), 0);

  async function load() {
    const [contasRes, bancosRes] = await Promise.all([fetch('/api/contas-pagar'), fetch('/api/bancos')]);
    if (contasRes.ok) setContas(await contasRes.json());
    if (bancosRes.ok) setBancos(await bancosRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setEditingCodigo(null);
    setForm(emptyForm);
    setParcelado(false);
    setParcelas([novaParcela(), novaParcela()]);
    setError('');
    setModalOpen(true);
  }

  function startEdit(c: ContaPagar) {
    setEditingCodigo(c.codigo);
    setForm({
      fornecedor: c.fornecedor || '',
      descricao: c.descricao,
      valor: c.valor,
      data_vencimento: c.data_vencimento.slice(0, 10),
      data_pagamento: c.data_pagamento ? c.data_pagamento.slice(0, 10) : '',
      status: c.status,
      banco_codigo: c.banco_codigo ? String(c.banco_codigo) : '',
    });
    setParcelado(false);
    setParcelas([novaParcela(), novaParcela()]);
    setError('');
    setModalOpen(true);
  }

  function cancelEdit() {
    setEditingCodigo(null);
    setForm(emptyForm);
    setParcelado(false);
    setParcelas([novaParcela(), novaParcela()]);
    setError('');
    setModalOpen(false);
  }

  function updateParcela(index: number, campo: keyof ParcelaForm, valor: string) {
    setParcelas((prev) => prev.map((p, i) => (i === index ? { ...p, [campo]: valor } : p)));
  }

  function addParcela() {
    setParcelas((prev) => {
      const ultima = prev[prev.length - 1];
      const dataBase = ultima?.data_vencimento || form.data_vencimento || hoje();
      return [...prev, { valor: '', data_vencimento: addMeses(dataBase, 1) }];
    });
  }

  function removeParcela(index: number) {
    setParcelas((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function gerarParcelasAutomaticamente() {
    const totalNumero = parseDecimal(form.valor);
    if (Number.isNaN(totalNumero) || totalNumero <= 0) {
      setError('Informe o valor total antes de gerar as parcelas.');
      return;
    }
    const dataBase = form.data_vencimento || hoje();
    const qtd = parcelas.length || 1;
    const valorParcela = Math.floor((totalNumero / qtd) * 100) / 100;
    const diferenca = Number((totalNumero - valorParcela * qtd).toFixed(2));
    const novasParcelas: ParcelaForm[] = Array.from({ length: qtd }, (_, i) => ({
      valor: (i === qtd - 1 ? valorParcela + diferenca : valorParcela).toFixed(2),
      data_vencimento: addMeses(dataBase, i),
    }));
    setParcelas(novasParcelas);
    setError('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!editingCodigo && parcelado) {
      if (!form.descricao.trim()) {
        setError('Informe a descrição.');
        return;
      }
      for (const p of parcelas) {
        const v = parseDecimal(p.valor);
        if (Number.isNaN(v) || v <= 0 || !p.data_vencimento) {
          setError('Informe valor e vencimento de todas as parcelas.');
          return;
        }
      }
      setLoading(true);
      try {
        const res = await fetch('/api/contas-pagar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fornecedor: form.fornecedor || null,
            descricao: form.descricao,
            parcelas: parcelas.map((p) => ({
              valor: parseDecimal(p.valor).toFixed(2),
              data_vencimento: p.data_vencimento,
            })),
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
      return;
    }

    const valorNumero = parseDecimal(form.valor);
    if (Number.isNaN(valorNumero) || valorNumero <= 0) {
      setError('Informe um valor válido.');
      return;
    }
    if (form.status === 'PAGO' && !form.banco_codigo) {
      setError('Selecione o banco em que o título foi baixado.');
      return;
    }

    setLoading(true);
    try {
      const url = editingCodigo ? `/api/contas-pagar/${editingCodigo}` : '/api/contas-pagar';
      const method = editingCodigo ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fornecedor: form.fornecedor || null,
          descricao: form.descricao,
          valor: valorNumero.toFixed(2),
          data_vencimento: form.data_vencimento || hoje(),
          data_pagamento: form.data_pagamento || null,
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

  function abrirBaixa(c: ContaPagar) {
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
      const res = await fetch(`/api/contas-pagar/${baixaConta.codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fornecedor: baixaConta.fornecedor,
          descricao: baixaConta.descricao,
          valor: baixaConta.valor,
          data_vencimento: baixaConta.data_vencimento.slice(0, 10),
          data_pagamento: hoje(),
          status: 'PAGO',
          banco_codigo: bancoBaixa,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setBaixaErro(data.error || 'Não foi possível marcar como pago.');
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
    const res = await fetch(`/api/contas-pagar/${codigo}`, { method: 'DELETE' });
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
        <h2>Contas a Pagar</h2>
        <button className="btn-primary" onClick={startNew} style={{ width: 'auto', padding: '10px 20px' }}>
          Novo Título
        </button>
      </div>

      <p className="hint" style={{ marginTop: -8, marginBottom: 16 }}>
        Total em aberto: R$ {totalAberto.toFixed(2)}
      </p>

      <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por fornecedor ou descrição..." />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Fornecedor</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Pagamento</th>
              <th>Banco</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {contasFiltradas.map((c) => (
              <tr key={c.codigo}>
                <td>{c.codigo}</td>
                <td>{c.fornecedor || '-'}</td>
                <td>{c.descricao}</td>
                <td>R$ {c.valor}</td>
                <td>{new Date(c.data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td>
                  {c.data_pagamento
                    ? new Date(c.data_pagamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
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
                      <button className="icon-btn" title="Marcar como Pago" onClick={() => abrirBaixa(c)}>
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
                <td colSpan={9}>Nenhum título encontrado.</td>
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
                  <label>Fornecedor</label>
                  <input
                    value={form.fornecedor}
                    onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
                    placeholder="Nome do fornecedor/favorecido"
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
                {!parcelado && (
                  <>
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
                  </>
                )}
                {editingCodigo && (
                  <>
                    <div className="field">
                      <label>Data de Pagamento</label>
                      <input
                        type="date"
                        value={form.data_pagamento}
                        onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value as ContaPagar['status'] })}
                      >
                        <option value="ABERTO">Em Aberto</option>
                        <option value="PAGO">Pago</option>
                        <option value="CANCELADO">Cancelado</option>
                      </select>
                    </div>
                    {form.status === 'PAGO' && (
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

              {!editingCodigo && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                  <input
                    type="checkbox"
                    checked={parcelado}
                    onChange={(e) => setParcelado(e.target.checked)}
                  />
                  Lançar em parcelas
                </label>
              )}

              {!editingCodigo && parcelado && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
                    <div className="field" style={{ margin: 0 }}>
                      <label>Valor total (opcional, p/ gerar parcelas)</label>
                      <div className="input-prefix-group">
                        <span className="input-prefix">R$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.valor}
                          onChange={(e) => setForm({ ...form, valor: e.target.value })}
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label>1º Vencimento</label>
                      <input
                        type="date"
                        value={form.data_vencimento || hoje()}
                        onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                      />
                    </div>
                    <button type="button" className="btn-small" onClick={gerarParcelasAutomaticamente}>
                      Gerar parcelas
                    </button>
                  </div>

                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Parcela</th>
                        <th>Valor (R$)</th>
                        <th>Vencimento</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {parcelas.map((p, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={p.valor}
                              onChange={(e) => updateParcela(i, 'valor', e.target.value)}
                              placeholder="0,00"
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              value={p.data_vencimento}
                              onChange={(e) => updateParcela(i, 'data_vencimento', e.target.value)}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="icon-btn danger"
                              title="Remover parcela"
                              onClick={() => removeParcela(i)}
                            >
                              <IconTrash />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button type="button" className="btn-small" style={{ marginTop: 8 }} onClick={addParcela}>
                    + Adicionar parcela
                  </button>
                  <p className="hint">
                    Total das parcelas: R${' '}
                    {parcelas.reduce((soma, p) => soma + (parseDecimal(p.valor) || 0), 0).toFixed(2)}
                  </p>
                </div>
              )}

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
