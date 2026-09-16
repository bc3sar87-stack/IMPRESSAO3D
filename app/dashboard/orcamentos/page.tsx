'use client';

import { useEffect, useState, FormEvent } from 'react';
import SearchBox from '../search-box';
import ProductPicker, { ProdutoPicker } from '../product-picker';

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
  consumo_w_hora: string;
}

interface Produto extends ProdutoPicker {}

interface MateriaPrimaCusto {
  codigo: number;
  valor_custo: string | null;
}

interface ItemMaterial {
  codigo: number;
  materia_prima_codigo: number;
  tipo_nome: string;
  marca: string;
  cor: string;
  cor_hex: string;
  unidade_medida_sigla: string;
  peso: string;
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

interface MaterialAgregado {
  materia_prima_codigo: number;
  nome: string;
  cor_hex: string;
  pesoTotal: number;
  unidade: string;
}

interface RaioXData {
  materialTotal: number;
  energiaTotal: number;
  maoDeObraTotal: number;
  embalagem: number;
  custosExtras: number;
  custoIndustrial: number;
  markup: number;
  lucro: number;
  precoBase: number;
  impostos: number;
  taxa: number;
  taxasValor: number;
  precoVenda: number;
  materiais: MaterialAgregado[];
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
  taxa_marketplace: 'VENDA_DIRETA',
  taxa_percentual: '0',
  embalagem_valor: '',
  custos_extras_valor: '',
};
const emptyNovoItem = { produto_codigo: '', quantidade: '', valor_unitario: '' };

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function parseDecimal(value: string): number {
  return Number(String(value).trim().replace(',', '.'));
}

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrimaCusto[]>([]);
  const [markupPadrao, setMarkupPadrao] = useState('');
  const [custoBaseFilamento, setCustoBaseFilamento] = useState('');
  const [valorConsumoHora, setValorConsumoHora] = useState('');
  const [custoMaoObraHora, setCustoMaoObraHora] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const [itensPendentes, setItensPendentes] = useState<ItemPendente[]>([]);
  const [novoItemLocal, setNovoItemLocal] = useState(emptyNovoItem);
  const [pickerFor, setPickerFor] = useState<'pendente' | 'existente' | null>(null);

  const [calculando, setCalculando] = useState(false);
  const [calcError, setCalcError] = useState('');
  const [raioX, setRaioX] = useState<RaioXData | null>(null);
  const [raioXOpen, setRaioXOpen] = useState(false);

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
    const [orcRes, cliRes, prodRes, eqRes, markupRes, mpRes, consumoRes, filamentoRes, maoObraRes] =
      await Promise.all([
        fetch('/api/orcamentos'),
        fetch('/api/clientes'),
        fetch('/api/produtos'),
        fetch('/api/equipamentos'),
        fetch('/api/markup-padrao'),
        fetch('/api/materia-prima'),
        fetch('/api/valor-consumo-hora'),
        fetch('/api/custo-base-filamento'),
        fetch('/api/custo-mao-obra-hora'),
      ]);
    if (orcRes.ok) setOrcamentos(await orcRes.json());
    if (cliRes.ok) setClientes(await cliRes.json());
    if (prodRes.ok) setProdutos(await prodRes.json());
    if (eqRes.ok) setEquipamentos(await eqRes.json());
    if (mpRes.ok) setMateriasPrimas(await mpRes.json());
    if (markupRes.ok) {
      const data = await markupRes.json();
      setMarkupPadrao(data.valor_percentual !== null ? Number(data.valor_percentual).toFixed(2) : '');
    }
    if (consumoRes.ok) {
      const data = await consumoRes.json();
      setValorConsumoHora(data.valor_hora !== null ? String(data.valor_hora) : '0');
    }
    if (filamentoRes.ok) {
      const data = await filamentoRes.json();
      setCustoBaseFilamento(data.valor !== null ? String(data.valor) : '0');
    }
    if (maoObraRes.ok) {
      const data = await maoObraRes.json();
      setCustoMaoObraHora(data.valor_hora !== null ? String(data.valor_hora) : '0');
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setEditingCodigo(null);
    setForm({ ...emptyForm, markup_percentual: markupPadrao });
    setItensPendentes([]);
    setNovoItemLocal(emptyNovoItem);
    setError('');
    setCalcError('');
    setRaioX(null);
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
    setCalcError('');
    setRaioX(null);

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
    setCalcError('');
    setRaioX(null);
    setModalOpen(false);
  }

  function handlePickProduto(p: ProdutoPicker) {
    if (pickerFor === 'pendente') {
      setNovoItemLocal({ ...novoItemLocal, produto_codigo: String(p.codigo), quantidade: String(p.quantidade) });
    } else if (pickerFor === 'existente') {
      setNovoItem({ ...novoItem, produto_codigo: String(p.codigo), quantidade: String(p.quantidade) });
    }
  }

  function handleAddItemLocal() {
    setError('');
    const produto = produtos.find((p) => String(p.codigo) === novoItemLocal.produto_codigo);
    if (!produto) {
      setError('Selecione um produto.');
      return;
    }
    setItensPendentes([
      ...itensPendentes,
      {
        produto_codigo: novoItemLocal.produto_codigo,
        produto_descricao: produto.descricao,
        quantidade: novoItemLocal.quantidade || String(produto.quantidade),
        valor_unitario: (novoItemLocal.valor_unitario || '0').replace(',', '.'),
      },
    ]);
    setNovoItemLocal(emptyNovoItem);
    setRaioX(null);
  }

  function handleRemoveItemLocal(index: number) {
    setItensPendentes(itensPendentes.filter((_, i) => i !== index));
    setRaioX(null);
  }

  async function handleCalcular() {
    setCalcError('');
    if (itensPendentes.length === 0) {
      setCalcError('Adicione ao menos um item para calcular o preço.');
      return;
    }
    setCalculando(true);
    try {
      const equipamentoSelecionado = equipamentos.find((eq) => String(eq.codigo) === form.equipamento_codigo);
      const consumoWHora = equipamentoSelecionado ? Number(equipamentoSelecionado.consumo_w_hora) : 0;
      const custoKgPadrao = parseDecimal(custoBaseFilamento) || 0;
      const valorHoraEnergia = parseDecimal(valorConsumoHora) || 0;
      const valorHoraMaoObra = parseDecimal(custoMaoObraHora) || 0;

      const materiaisMap = new Map<number, MaterialAgregado>();

      const itensCalculados = await Promise.all(
        itensPendentes.map(async (item) => {
          const produto = produtos.find((p) => String(p.codigo) === item.produto_codigo);
          const quantidade = produto?.quantidade || Number(item.quantidade) || 1;
          const res = await fetch(`/api/produtos/${item.produto_codigo}/materiais`);
          const materiais: ItemMaterial[] = res.ok ? await res.json() : [];

          let materialCost = 0;
          for (const m of materiais) {
            const mp = materiasPrimas.find((x) => x.codigo === m.materia_prima_codigo);
            const custoKg = mp?.valor_custo ? Number(mp.valor_custo) : custoKgPadrao;
            const pesoNum = Number(m.peso) || 0;
            materialCost += (pesoNum / 1000) * custoKg;

            const existente = materiaisMap.get(m.materia_prima_codigo);
            if (existente) {
              existente.pesoTotal += pesoNum;
            } else {
              materiaisMap.set(m.materia_prima_codigo, {
                materia_prima_codigo: m.materia_prima_codigo,
                nome: `${m.tipo_nome} — ${m.marca} (${m.cor})`,
                cor_hex: m.cor_hex || '#cbd5e1',
                pesoTotal: pesoNum,
                unidade: m.unidade_medida_sigla,
              });
            }
          }

          const horasImpressao = (produto?.tempo_impressao_segundos || 0) / 3600;
          const horasMaoObra = (produto?.tempo_mao_obra_segundos || 0) / 3600;
          const energiaCost = (consumoWHora / 1000) * horasImpressao * valorHoraEnergia;
          const maoDeObraCost = horasMaoObra * valorHoraMaoObra;

          return { item, quantidade, materialCost, energiaCost, maoDeObraCost };
        })
      );

      const embalagem = parseDecimal(form.embalagem_valor) || 0;
      const custosExtras = parseDecimal(form.custos_extras_valor) || 0;
      const markup = parseDecimal(form.markup_percentual) || 0;
      const impostos = parseDecimal(form.impostos_percentual) || 0;
      const taxa = parseDecimal(form.taxa_percentual) || 0;

      const materialTotal = itensCalculados.reduce((s, i) => s + i.materialCost, 0);
      const energiaTotal = itensCalculados.reduce((s, i) => s + i.energiaCost, 0);
      const maoDeObraTotal = itensCalculados.reduce((s, i) => s + i.maoDeObraCost, 0);
      const custoIndustrial = materialTotal + energiaTotal + maoDeObraTotal + embalagem + custosExtras;
      const lucro = custoIndustrial * (markup / 100);
      const precoBase = custoIndustrial + lucro;
      const percentualFees = (impostos + taxa) / 100;
      const precoVenda = percentualFees < 1 ? precoBase / (1 - percentualFees) : precoBase;
      const taxasValor = precoVenda - precoBase;

      const somaBaseItens = itensCalculados.reduce((s, i) => s + i.materialCost + i.energiaCost + i.maoDeObraCost, 0);
      const itensAtualizados = itensCalculados.map(({ item, quantidade, materialCost, energiaCost, maoDeObraCost }) => {
        const baseItem = materialCost + energiaCost + maoDeObraCost;
        const proporcao = somaBaseItens > 0 ? baseItem / somaBaseItens : 1 / itensCalculados.length;
        const precoItem = precoVenda * proporcao;
        const valorUnitario = quantidade > 0 ? precoItem / quantidade : precoItem;
        return { ...item, quantidade: String(quantidade), valor_unitario: valorUnitario.toFixed(2) };
      });

      setItensPendentes(itensAtualizados);
      setRaioX({
        materialTotal,
        energiaTotal,
        maoDeObraTotal,
        embalagem,
        custosExtras,
        custoIndustrial,
        markup,
        lucro,
        precoBase,
        impostos,
        taxa,
        taxasValor,
        precoVenda,
        materiais: Array.from(materiaisMap.values()),
      });
      setRaioXOpen(true);
    } finally {
      setCalculando(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const numericFields = [
      'markup_percentual',
      'impostos_percentual',
      'taxa_percentual',
      'embalagem_valor',
      'custos_extras_valor',
    ] as const;
    const sanitized = { ...form };
    for (const field of numericFields) {
      const raw = sanitized[field];
      sanitized[field] = raw === '' ? '0' : String(raw).replace(',', '.');
      if (Number.isNaN(Number(sanitized[field]))) {
        setError('Informe valores numéricos válidos na precificação (use ponto ou vírgula para decimais).');
        return;
      }
    }

    setLoading(true);
    try {
      const url = editingCodigo ? `/api/orcamentos/${editingCodigo}` : '/api/orcamentos';
      const method = editingCodigo ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sanitized, data: sanitized.data || hoje() }),
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
    if (!novoItem.produto_codigo) {
      setItemError('Selecione um produto.');
      return;
    }
    const res = await fetch(`/api/orcamentos/${selecionado.codigo}/itens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...novoItem, valor_unitario: (novoItem.valor_unitario || '0').replace(',', '.') }),
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

  const produtoSelecionadoPendente = produtos.find((p) => String(p.codigo) === novoItemLocal.produto_codigo);
  const produtoSelecionadoExistente = produtos.find((p) => String(p.codigo) === novoItem.produto_codigo);

  const custoPct = raioX && raioX.precoVenda > 0 ? (raioX.custoIndustrial / raioX.precoVenda) * 100 : 0;
  const taxaPct = raioX && raioX.precoVenda > 0 ? (raioX.taxasValor / raioX.precoVenda) * 100 : 0;
  const lucroPct = raioX && raioX.precoVenda > 0 ? (raioX.lucro / raioX.precoVenda) * 100 : 0;

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
                    type="text"
                    inputMode="decimal"
                    value={form.markup_percentual}
                    onChange={(e) => setForm({ ...form, markup_percentual: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Impostos (DAS) (%)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.impostos_percentual}
                    onChange={(e) => setForm({ ...form, impostos_percentual: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Taxa Marketplace</label>
                  <select
                    value={form.taxa_marketplace}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm({
                        ...form,
                        taxa_marketplace: value,
                        taxa_percentual: value === 'VENDA_DIRETA' ? '0' : form.taxa_percentual,
                      });
                    }}
                  >
                    <option value="VENDA_DIRETA">Venda Direta (0%)</option>
                    <option value="MANUAL">Manual</option>
                  </select>
                </div>
                <div className="field">
                  <label>% Taxa</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.taxa_percentual}
                    onChange={(e) => setForm({ ...form, taxa_percentual: e.target.value })}
                    disabled={form.taxa_marketplace === 'VENDA_DIRETA'}
                  />
                </div>
                <div className="field">
                  <label>Embalagem (R$)</label>
                  <div className="input-prefix-group">
                    <span className="input-prefix">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
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
                      type="text"
                      inputMode="decimal"
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

                  {calcError && <div className="error-msg">{calcError}</div>}

                  <div className="form-grid">
                    <div className="field">
                      <label>Produto</label>
                      <button
                        type="button"
                        className="pricing-select-btn"
                        onClick={() => setPickerFor('pendente')}
                      >
                        {produtoSelecionadoPendente ? (
                          produtoSelecionadoPendente.descricao
                        ) : (
                          <span className="pricing-select-placeholder">Selecionar produto...</span>
                        )}
                      </button>
                    </div>
                    <div className="field">
                      <label>Quantidade (do cadastro do produto)</label>
                      <input value={novoItemLocal.quantidade} disabled />
                    </div>
                    <div className="field">
                      <label>Valor Unitário (R$)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Use Calcular Preço para sugestão"
                        value={novoItemLocal.valor_unitario}
                        onChange={(e) => setNovoItemLocal({ ...novoItemLocal, valor_unitario: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <button type="button" className="btn-small" onClick={handleAddItemLocal}>
                      Adicionar item à lista
                    </button>
                    {itensPendentes.length > 0 && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleCalcular}
                        disabled={calculando}
                      >
                        {calculando ? 'Calculando...' : 'Calcular Preço'}
                      </button>
                    )}
                  </div>
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

      {raioXOpen && raioX && (
        <div className="modal-overlay" onClick={() => setRaioXOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>Raio-X do Preço</h3>
              <button type="button" className="modal-close" onClick={() => setRaioXOpen(false)} aria-label="Fechar">
                ×
              </button>
            </div>

            <p className="hint" style={{ marginTop: -8, fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>
              Distribuição do valor de venda
            </p>
            <div className="raiox-bar">
              {custoPct > 0 && (
                <div className="raiox-bar-segment" style={{ background: '#ef4444', width: `${custoPct}%` }}>
                  {custoPct.toFixed(1)}%
                </div>
              )}
              {taxaPct > 0 && (
                <div className="raiox-bar-segment" style={{ background: '#f97316', width: `${taxaPct}%` }}>
                  {taxaPct.toFixed(1)}%
                </div>
              )}
              {lucroPct > 0 && (
                <div className="raiox-bar-segment" style={{ background: '#22c55e', width: `${lucroPct}%` }}>
                  {lucroPct.toFixed(1)}%
                </div>
              )}
            </div>
            <div className="raiox-legend">
              <div className="raiox-legend-item">
                <span className="raiox-dot" style={{ background: '#ef4444' }} />
                Custos (R$ {raioX.custoIndustrial.toFixed(2)})
              </div>
              <div className="raiox-legend-item">
                <span className="raiox-dot" style={{ background: '#f97316' }} />
                Taxas (R$ {raioX.taxasValor.toFixed(2)})
              </div>
              <div className="raiox-legend-item">
                <span className="raiox-dot" style={{ background: '#22c55e' }} />
                Lucro (R$ {raioX.lucro.toFixed(2)})
              </div>
            </div>

            <div className="raiox-section-title">1. Custo Industrial</div>
            <div className="raiox-line">
              <div>
                <div className="raiox-line-label">Material Consumido</div>
                <div className="raiox-line-hint">Custo do filamento/resina usado na peça.</div>
              </div>
              <div className="raiox-line-value">R$ {raioX.materialTotal.toFixed(2)}</div>
            </div>
            <div className="raiox-line">
              <div>
                <div className="raiox-line-label">Energia Elétrica</div>
                <div className="raiox-line-hint">Baseado na potência da máquina e no tempo de impressão.</div>
              </div>
              <div className="raiox-line-value">R$ {raioX.energiaTotal.toFixed(2)}</div>
            </div>
            <div className="raiox-line">
              <div>
                <div className="raiox-line-label">Mão de Obra</div>
                <div className="raiox-line-hint">Tempo de fatiamento, operação e acabamento.</div>
              </div>
              <div className="raiox-line-value">R$ {raioX.maoDeObraTotal.toFixed(2)}</div>
            </div>
            <div className="raiox-line">
              <div>
                <div className="raiox-line-label">Embalagem &amp; Fixos</div>
                <div className="raiox-line-hint">Caixa, plástico bolha e outros insumos.</div>
              </div>
              <div className="raiox-line-value">R$ {(raioX.embalagem + raioX.custosExtras).toFixed(2)}</div>
            </div>

            {raioX.materiais.length > 0 && (
              <div className="raiox-box">
                <div className="raiox-box-title">
                  CONSUMO DE MATERIAL — Total: {raioX.materiais.reduce((s, m) => s + m.pesoTotal, 0).toFixed(1)}{' '}
                  {raioX.materiais[0]?.unidade}
                </div>
                {raioX.materiais.map((m) => (
                  <div className="raiox-material-row" key={m.materia_prima_codigo}>
                    <span>
                      <span className="color-swatch" style={{ backgroundColor: m.cor_hex }} />
                      {m.nome}
                    </span>
                    <span>
                      {m.pesoTotal.toFixed(1)} {m.unidade}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="raiox-box">
              <div className="raiox-box-title">MARKUP DE {raioX.markup.toFixed(1)}%</div>
              <p className="hint" style={{ margin: 0 }}>
                Valor adicionado sobre o custo para gerar a receita base.
              </p>
            </div>

            <div className="raiox-section-title">2. Custos de Venda</div>
            <div className="raiox-line">
              <div>
                <div className="raiox-line-label">Impostos (DAS)</div>
                <div className="raiox-line-hint">{raioX.impostos.toFixed(1)}% sobre o valor de venda.</div>
              </div>
              <div className="raiox-line-value">R$ {((raioX.precoVenda * raioX.impostos) / 100).toFixed(2)}</div>
            </div>
            <div className="raiox-line">
              <div>
                <div className="raiox-line-label">Taxa Marketplace</div>
                <div className="raiox-line-hint">{raioX.taxa.toFixed(1)}% sobre o valor de venda.</div>
              </div>
              <div className="raiox-line-value">R$ {((raioX.precoVenda * raioX.taxa) / 100).toFixed(2)}</div>
            </div>

            <div className="raiox-total">
              <span>Preço de Venda Sugerido</span>
              <span>R$ {raioX.precoVenda.toFixed(2)}</span>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: 16, width: '100%' }}
              onClick={() => setRaioXOpen(false)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <ProductPicker
        open={pickerFor !== null}
        produtos={produtos}
        custoBaseFilamento={custoBaseFilamento}
        onSelect={handlePickProduto}
        onClose={() => setPickerFor(null)}
      />

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
                <button
                  type="button"
                  className="pricing-select-btn"
                  onClick={() => setPickerFor('existente')}
                >
                  {produtoSelecionadoExistente ? (
                    produtoSelecionadoExistente.descricao
                  ) : (
                    <span className="pricing-select-placeholder">Selecionar produto...</span>
                  )}
                </button>
              </div>
              <div className="field">
                <label>Quantidade (do cadastro do produto)</label>
                <input value={novoItem.quantidade} disabled />
              </div>
              <div className="field">
                <label>Valor Unitário (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
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
