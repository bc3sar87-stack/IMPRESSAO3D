'use client';

import { useEffect, useState, FormEvent } from 'react';
import SearchBox from '../search-box';

interface Orcamento {
  codigo: number;
  cliente_codigo: number;
  cliente_nome: string;
  data: string;
  data_entrega: string | null;
  status: 'ABERTO' | 'APROVADO' | 'REJEITADO';
  observacoes: string | null;
  valor_total: string;
  equipamento_codigo: number | null;
  equipamento_fabricante: string | null;
  equipamento_modelo: string | null;
  markup_percentual: string;
  impostos_percentual: string;
  taxa_marketplace: string;
  taxa_percentual: string;
  embalagem_valor: string;
  custos_extras_valor: string;
}

interface Cliente {
  codigo: number;
  nome: string;
}

interface Equipamento {
  codigo: number;
  fabricante: string;
  modelo: string;
}

interface Produto {
  codigo: number;
  descricao: string;
}

interface ItemOrcamento {
  codigo: number;
  produto_codigo: number;
  produto_descricao: string;
  quantidade: string;
  valor_unitario: string;
  subtotal: string;
}

interface ItemPendente {
  produto_codigo: string;
  produto_descricao: string;
  quantidade: string;
  valor_unitario: string;
}

const emptyForm = {
  cliente_codigo: '',
  data: '',
  data_entrega: '',
  status: 'ABERTO' as Orcamento['status'],
  observacoes: '',
  equipamento_codigo: '',
  markup_percentual: '',
  impostos_percentual: '',
  taxa_marketplace: 'MANUAL',
  taxa_percentual: '',
  embalagem_valor: '',
  custos_extras_valor: '',
};
const emptyNovoItem = { produto_codigo: '', quantidade: '', valor_unitario: '' };

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const [itensPendentes, setItensPendentes] = useState<ItemPendente[]>([]);
  const [novoItemLocal, setNovoItemLocal] = useState(emptyNovoItem);

  const [selecionado, setSelecionado] = useState<Orcamento | null>(null);
  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [novoItem, setNovoItem] = useState(emptyNovoItem);
  const [itemError, setItemError] = useState('');

  const orcamentosFiltrados = orcamentos.filter((o) => {
    const q = busca.toLowerCase();
    return o.cliente_nome.toLowerCase().includes(q) || o.status.toLowerCase().includes(q);
  });

  const totalPendente = itensPendentes.reduce(
    (soma, item) => soma + Number(item.quantidade || 0) * Number(item.valor_unitario || 0),
    0
  );

  async function load() {
    const [orcRes, cliRes, prodRes, eqRes] = await Promise.all([
      fetch('/api/orcamentos'),
      fetch('/api/clientes'),
      fetch('/api/produtos'),
      fetch('/api/equipamentos'),
    ]);
    if (orcRes.ok) setOrcamentos(await orcRes.json());
    if (cliRes.ok) setClientes(await cliRes.json());
    if (prodRes.ok) setProdutos(await prodRes.json());
    if (eqRes.ok) setEquipamentos(await eqRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setEditingCodigo(null);
    setForm(emptyForm);
    setItensPendentes([]);
    setNovoItemLocal(emptyNovoItem);
    setError('');
    setModalOpen(true);
  }

  function startEdit(o: Orcamento) {
    setEditingCodigo(o.codigo);
    setForm({
      cliente_codigo: String(o.cliente_codigo),
      data: o.data.slice(0, 10),
      data_entrega: o.data_entrega ? o.data_entrega.slice(0, 10) : '',
      status: o.status,
      observacoes: o.observacoes || '',
      equipamento_codigo: o.equipamento_codigo ? String(o.equipamento_codigo) : '',
      markup_percentual: o.markup_percentual || '',
      impostos_percentual: o.impostos_percentual || '',
      taxa_marketplace: o.taxa_marketplace || 'MANUAL',
      taxa_percentual: o.taxa_percentual || '',
      embalagem_valor: o.embalagem_valor || '',
      custos_extras_valor: o.custos_extras_valor || '',
    });
    setItensPendentes([]);
    setNovoItemLocal(emptyNovoItem);
    setError('');
    setModalOpen(true);
  }

  async function startCopy(o: Orcamento) {
    setEditingCodigo(null);
    setForm({
      cliente_codigo: String(o.cliente_codigo),
      data: hoje(),
      data_entrega: '',
      status: 'ABERTO',
      observacoes: o.observacoes || '',
      equipamento_codigo: o.equipamento_codigo ? String(o.equipamento_codigo) : '',
      markup_percentual: o.markup_percentual || '',
      impostos_percentual: o.impostos_percentual || '',
      taxa_marketplace: o.taxa_marketplace || 'MANUAL',
      taxa_percentual: o.taxa_percentual || '',
      embalagem_valor: o.embalagem_valor || '',
      custos_extras_valor: o.custos_extras_valor || '',
    });
    setNovoItemLocal(emptyNovoItem);
    setError('');

    const res = await fetch(`/api/orcamentos/${o.codigo}/itens`);
    if (res.ok) {
      const itensOriginais: ItemOrcamento[] = await res.json();
      setItensPendentes(
        itensOriginais.map((item) => ({
          produto_codigo: String(item.produto_codigo),
          produto_descricao: item.produto_descricao,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
        }))
      );
    } else {
      setItensPendentes([]);
    }

    setModalOpen(true);
  }

  function cancelEdit() {
    setEditingCodigo(null);
    setForm(emptyForm);
    setItensPendentes([]);
    setNovoItemLocal(emptyNovoItem);
    setError('');
    setModalOpen(false);
  }

  function handleAddItemLocal() {
    setError('');
    const produto = produtos.find((p) => String(p.codigo) === novoItemLocal.produto_codigo);
    if (!produto || !novoItemLocal.quantidade || novoItemLocal.valor_unitario === '') {
      setError('Selecione o produto e informe quantidade e valor do item.');
      return;
    }
    setItensPendentes([
      ...itensPendentes,
      { ...novoItemLocal, produto_descricao: produto.descricao },
    ]);
    setNovoItemLocal(emptyNovoItem);
  }

  function handleRemoveItemLocal(index: number) {
    setItensPendentes(itensPendentes.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = editingCodigo ? `/api/orcamentos/${editingCodigo}` : '/api/orcamentos';
      const method = editingCodigo ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, data: form.data || hoje() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Não foi possível salvar.');
        return;
      }

      if (!editingCodigo && itensPendentes.length > 0) {
        const codigo = data.codigo;
        for (const item of itensPendentes) {
          const itemRes = await fetch(`/api/orcamentos/${codigo}/itens`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
          if (!itemRes.ok) {
            const itemData = await itemRes.json().catch(() => ({}));
            setError(
              `Orçamento criado, mas houve um problema ao adicionar "${item.produto_descricao}": ${itemData.error || 'erro desconhecido'}`
            );
            load();
            return;
          }
        }
      }

      cancelEdit();
      load();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(codigo: number) {
    if (!confirm('Excluir este orçamento?')) return;
    const res = await fetch(`/api/orcamentos/${codigo}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Não foi possível excluir.');
      return;
    }
    load();
  }

  async function abrirItens(o: Orcamento) {
    setSelecionado(o);
    setItemError('');
    setNovoItem(emptyNovoItem);
    const res = await fetch(`/api/orcamentos/${o.codigo}/itens`);
    if (res.ok) setItens(await res.json());
  }

  function fecharItens() {
    setSelecionado(null);
    setItens([]);
  }

  async function refreshItens(codigo: number) {
    const [itensRes, orcRes] = await Promise.all([
      fetch(`/api/orcamentos/${codigo}/itens`),
      fetch('/api/orcamentos'),
    ]);
    if (itensRes.ok) setItens(await itensRes.json());
    if (orcRes.ok) {
      const lista: Orcamento[] = await orcRes.json();
      setOrcamentos(lista);
      const atual = lista.find((o) => o.codigo === codigo);
      if (atual) setSelecionado(atual);
    }
  }

  async function handleAddItem(e: FormEvent) {
    e.preventDefault();
    if (!selecionado) return;
    setItemError('');
    const res = await fetch(`/api/orcamentos/${selecionado.codigo}/itens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoItem),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setItemError(data.error || 'Não foi possível adicionar.');
      return;
    }
    setNovoItem(emptyNovoItem);
    await refreshItens(selecionado.codigo);
  }

  async function handleDeleteItem(itemCodigo: number) {
    if (!selecionado) return;
    await fetch(`/api/orcamentos/${selecionado.codigo}/itens/${itemCodigo}`, { method: 'DELETE' });
    await refreshItens(selecionado.codigo);
  }

  return (
    <div>
      <div className="page-header">
        <h2>Orçamentos</h2>
        <button className="btn-primary" onClick={startNew} style={{ width: 'auto', padding: '10px 20px' }}>
          Novo Orçamento
        </button>
      </div>

      {clientes.length === 0 && (
        <div className="error-msg">
          Cadastre pelo menos um Cliente antes de criar um orçamento.
        </div>
      )}

      <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por cliente ou status..." />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Data</th>
              <th>Entrega</th>
              <th>Equipamento</th>
              <th>Status</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orcamentosFiltrados.map((o) => (
              <tr key={o.codigo}>
                <td>{o.codigo}</td>
                <td>{o.cliente_nome}</td>
                <td>{new Date(o.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td>
                  {o.data_entrega
                    ? new Date(o.data_entrega).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                    : '-'}
                </td>
                <td>
                  {o.equipamento_fabricante ? `${o.equipamento_fabricante} ${o.equipamento_modelo}` : '-'}
                </td>
                <td>{o.status}</td>
                <td>R$ {o.valor_total}</td>
                <td>
                  <button className="btn-small" onClick={() => startEdit(o)}>
                    Editar
                  </button>
                  <button className="btn-small" onClick={() => startCopy(o)}>
                    Copiar
                  </button>
                  <button className="btn-small" onClick={() => abrirItens(o)}>
                    Itens
                  </button>
                  <button className="btn-small danger" onClick={() => handleDelete(o.codigo)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {orcamentosFiltrados.length === 0 && (
              <tr>
                <td colSpan={8}>Nenhum orçamento encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCodigo ? 'Editar orçamento' : 'Novo orçamento'}</h3>
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
                required
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {clientes.map((c) => (
                  <option key={c.codigo} value={c.codigo}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Data</label>
              <input
                type="date"
                value={form.data || hoje()}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Data de Entrega</label>
              <input
                type="date"
                value={form.data_entrega}
                onChange={(e) => setForm({ ...form, data_entrega: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Orcamento['status'] })}
              >
                <option value="ABERTO">Aberto</option>
                <option value="APROVADO">Aprovado</option>
                <option value="REJEITADO">Rejeitado</option>
              </select>
            </div>
            <div className="field">
              <label>Equipamento de Impressão</label>
              <select
                value={form.equipamento_codigo}
                onChange={(e) => setForm({ ...form, equipamento_codigo: e.target.value })}
              >
                <option value="">Selecione...</option>
                {equipamentos.map((eq) => (
                  <option key={eq.codigo} value={eq.codigo}>
                    {eq.fabricante} {eq.modelo}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Observações</label>
              <input
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </div>
          </div>

          <h4 style={{ marginTop: 24, marginBottom: 8 }}>Precificação Avançada</h4>
          <div className="form-grid">
            <div className="field">
              <label>Markup (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.markup_percentual}
                onChange={(e) => setForm({ ...form, markup_percentual: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Impostos (DAS) (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.impostos_percentual}
                onChange={(e) => setForm({ ...form, impostos_percentual: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Taxa Marketplace</label>
              <select
                value={form.taxa_marketplace}
                onChange={(e) => setForm({ ...form, taxa_marketplace: e.target.value })}
              >
                <option value="MANUAL">Manual</option>
              </select>
            </div>
            <div className="field">
              <label>% Taxa</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.taxa_percentual}
                onChange={(e) => setForm({ ...form, taxa_percentual: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Embalagem (R$)</label>
              <div className="input-prefix-group">
                <span className="input-prefix">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.embalagem_valor}
                  onChange={(e) => setForm({ ...form, embalagem_valor: e.target.value })}
                />
              </div>
            </div>
            <div className="field">
              <label>Custos Extras (R$)</label>
              <div className="input-prefix-group">
                <span className="input-prefix">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.custos_extras_valor}
                  onChange={(e) => setForm({ ...form, custos_extras_valor: e.target.value })}
                />
              </div>
            </div>
          </div>

          {!editingCodigo && (
            <>
              <h4 style={{ marginTop: 24, marginBottom: 8 }}>Itens do orçamento</h4>

              {itensPendentes.length > 0 && (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Quantidade</th>
                        <th>Valor Unitário</th>
                        <th>Subtotal</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensPendentes.map((item, index) => (
                        <tr key={index}>
                          <td>{item.produto_descricao}</td>
                          <td>{item.quantidade}</td>
                          <td>R$ {Number(item.valor_unitario).toFixed(2)}</td>
                          <td>R$ {(Number(item.quantidade) * Number(item.valor_unitario)).toFixed(2)}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-small danger"
                              onClick={() => handleRemoveItemLocal(index)}
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>
                          Total
                        </td>
                        <td style={{ fontWeight: 600 }}>R$ {totalPendente.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <div className="form-grid">
                <div className="field">
                  <label>Produto</label>
                  <select
                    value={novoItemLocal.produto_codigo}
                    onChange={(e) => setNovoItemLocal({ ...novoItemLocal, produto_codigo: e.target.value })}
                  >
                    <option value="" disabled>
                      Selecione...
                    </option>
                    {produtos.map((p) => (
                      <option key={p.codigo} value={p.codigo}>
                        {p.descricao}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Quantidade</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={novoItemLocal.quantidade}
                    onChange={(e) => setNovoItemLocal({ ...novoItemLocal, quantidade: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Valor Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={novoItemLocal.valor_unitario}
                    onChange={(e) => setNovoItemLocal({ ...novoItemLocal, valor_unitario: e.target.value })}
                  />
                </div>
              </div>
              <button type="button" className="btn-small" onClick={handleAddItemLocal} style={{ marginTop: 8 }}>
                Adicionar item à lista
              </button>
            </>
          )}

              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button className="btn-primary" type="submit" disabled={loading} style={{ width: 'auto', padding: '10px 20px' }}>
                  {editingCodigo ? 'Salvar' : 'Criar orçamento'}
                </button>
                <button type="button" className="btn-small" onClick={cancelEdit}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selecionado && (
        <div className="card">
          <div className="card-header">
            <h3>
              Itens do orçamento #{selecionado.codigo} — {selecionado.cliente_nome}
              <br />
              <small style={{ color: '#64748b', fontWeight: 400 }}>
                Total: R$ {selecionado.valor_total}
              </small>
            </h3>
            <button className="btn-small" onClick={fecharItens}>
              Fechar
            </button>
          </div>

          {itemError && <div className="error-msg">{itemError}</div>}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Quantidade</th>
                  <th>Valor Unitário</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.codigo}>
                    <td>{item.produto_descricao}</td>
                    <td>{item.quantidade}</td>
                    <td>R$ {item.valor_unitario}</td>
                    <td>R$ {item.subtotal}</td>
                    <td>
                      <button className="btn-small danger" onClick={() => handleDeleteItem(item.codigo)}>
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
                {itens.length === 0 && (
                  <tr>
                    <td colSpan={5}>Nenhum item adicionado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <form onSubmit={handleAddItem}>
            <div className="form-grid">
              <div className="field">
                <label>Produto</label>
                <select
                  value={novoItem.produto_codigo}
                  onChange={(e) => setNovoItem({ ...novoItem, produto_codigo: e.target.value })}
                  required
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {produtos.map((p) => (
                    <option key={p.codigo} value={p.codigo}>
                      {p.descricao}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Quantidade</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={novoItem.quantidade}
                  onChange={(e) => setNovoItem({ ...novoItem, quantidade: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Valor Unitário (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={novoItem.valor_unitario}
                  onChange={(e) => setNovoItem({ ...novoItem, valor_unitario: e.target.value })}
                  required
                />
              </div>
            </div>
            <button className="btn-small" type="submit" style={{ marginTop: 8 }}>
              Adicionar item
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
