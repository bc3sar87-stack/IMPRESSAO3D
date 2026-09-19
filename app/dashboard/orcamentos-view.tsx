'use client';

import { useEffect, useState, FormEvent } from 'react';
import SearchBox from './search-box';
import ProductPicker, { ProdutoPicker } from './product-picker';
import MateriaPrimaPicker, { MateriaPrimaPickerItem } from './materia-prima-picker';
import { maskCPF, maskCNPJ, maskTelefone } from '@/lib/masks';
import {
  IconEdit,
  IconCopy,
  IconList,
  IconCalculator,
  IconTrash,
  IconCheck,
  IconMail,
  IconFileText,
  IconPalette,
} from './icons';

export type OrcamentoStatus =
  | 'ABERTO'
  | 'APROVADO'
  | 'REJEITADO'
  | 'EM_PRODUCAO'
  | 'FINALIZADO'
  | 'PENDENTE_ENTREGA'
  | 'ENTREGUE';

const STATUS_LABELS: Record<OrcamentoStatus, string> = {
  ABERTO: 'Pendente',
  APROVADO: 'Aprovado',
  REJEITADO: 'Reprovado',
  EM_PRODUCAO: 'Em Produção',
  FINALIZADO: 'Finalizado',
  PENDENTE_ENTREGA: 'Pendente de Entrega',
  ENTREGUE: 'Entregue',
};

const STATUS_SELECT_CLASS: Record<OrcamentoStatus, string> = {
  ABERTO: 'status-select-blue',
  APROVADO: 'status-select-green',
  REJEITADO: 'status-select-red',
  EM_PRODUCAO: 'status-select-orange',
  FINALIZADO: 'status-select-gray',
  PENDENTE_ENTREGA: 'status-select-purple',
  ENTREGUE: 'status-select-green',
};

interface Orcamento {
  codigo: number;
  cliente_codigo: number;
  cliente_nome: string;
  data: string;
  data_entrega: string | null;
  status: OrcamentoStatus;
  observacoes: string | null;
  valor_total: string;
  valor_sugerido: string | null;
  custo_total: string | null;
  equipamento_codigo: number | null;
  equipamento_fabricante: string | null;
  equipamento_modelo: string | null;
  markup_percentual: string;
  impostos_percentual: string;
  taxa_marketplace: string;
  taxa_percentual: string;
  embalagem_valor: string;
  custos_extras_valor: string;
  consome_estoque: boolean;
  total_itens: string;
}

interface Cliente {
  codigo: number;
  nome: string;
  email: string | null;
}

interface EnvioLog {
  codigo: number;
  destinatario: string;
  sucesso: boolean;
  erro_mensagem: string | null;
  enviado_em: string;
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
  codigo?: number;
  materia_prima_codigo: number;
  tipo_nome: string;
  cor: string;
  cor_hex: string;
  unidade_medida_sigla: string;
  peso: string;
  lote_codigo?: number | null;
}

interface LoteEstoque {
  codigo: number;
  fornecedor: string | null;
  valor_custo: string | null;
  quantidade_inicial: string | null;
  data_compra: string | null;
  observacao: string | null;
  saldo: string;
  reservado: string;
}

interface ItemOrcamento {
  codigo: number;
  produto_codigo: number;
  produto_descricao: string;
  quantidade: string;
  valor_unitario: string;
  subtotal: string;
  materiais: ItemMaterial[];
}

interface ItemPendente {
  produto_codigo: string;
  produto_descricao: string;
  quantidade: string;
  valor_unitario: string;
  custo_unitario: string;
  custo_detalhado?: CustoDetalhado;
  materiais: ItemMaterial[];
}

interface MaterialAgregado {
  materia_prima_codigo: number;
  nome: string;
  cor_hex: string;
  pesoTotal: number;
  unidade: string;
}

interface CustoDetalhado {
  materiais: { nome: string; cor: string; peso: string; unidade: string; custo: number }[];
  materialCost: number;
  maoDeObraCost: number;
  energiaCost: number;
  custosFixos: { descricao: string; custo: number }[];
  custosFixosCost: number;
  total: number;
}

interface RaioXData {
  materialTotal: number;
  energiaTotal: number;
  maoDeObraTotal: number;
  custosFixosTotal: number;
  custosFixos: { descricao: string; custo: number }[];
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

const emptyNovoItem = { produto_codigo: '', quantidade: '', valor_unitario: '' };

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function parseDecimal(value: string): number {
  return Number(String(value).trim().replace(',', '.'));
}

export default function OrcamentosView({ titulo, status }: { titulo: string; status: OrcamentoStatus }) {
  const emptyForm = {
    cliente_codigo: '',
    data: '',
    data_entrega: '',
    status,
    observacoes: '',
    equipamento_codigo: '',
    markup_percentual: '',
    impostos_percentual: '',
    taxa_marketplace: 'VENDA_DIRETA',
    taxa_percentual: '0',
    embalagem_valor: '',
    custos_extras_valor: '',
    consome_estoque: true,
  };

  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);
  const [novoClienteForm, setNovoClienteForm] = useState({
    tipo_pessoa: 'PF' as 'PF' | 'PJ',
    documento: '',
    nome: '',
    telefone: '',
    email: '',
    endereco: '',
  });
  const [novoClienteError, setNovoClienteError] = useState('');
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [grupos, setGrupos] = useState<{ codigo: number; nome: string }[]>([]);
  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrimaCusto[]>([]);
  const [materiasPrimasCompletas, setMateriasPrimasCompletas] = useState<MateriaPrimaPickerItem[]>([]);
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

  const [addingItem, setAddingItem] = useState(false);
  const [recalculandoCodigo, setRecalculandoCodigo] = useState<number | null>(null);
  const [contaReceberOrcamento, setContaReceberOrcamento] = useState<Orcamento | null>(null);
  const [contaReceberVencimento, setContaReceberVencimento] = useState('');
  const [gerandoContaReceber, setGerandoContaReceber] = useState(false);
  const [raioX, setRaioX] = useState<RaioXData | null>(null);
  const [raioXOpen, setRaioXOpen] = useState(false);

  const [selecionado, setSelecionado] = useState<Orcamento | null>(null);
  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [novoItem, setNovoItem] = useState(emptyNovoItem);
  const [itemError, setItemError] = useState('');
  const [custosItens, setCustosItens] = useState<Record<number, number>>({});
  const [custosItensDetalhado, setCustosItensDetalhado] = useState<Record<number, CustoDetalhado>>({});
  const [custosOrcamentosDetalhado, setCustosOrcamentosDetalhado] = useState<Record<number, CustoDetalhado | null>>({});
  const [emailOrcamento, setEmailOrcamento] = useState<Orcamento | null>(null);
  const [emailDestinatario, setEmailDestinatario] = useState('');
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [emailErro, setEmailErro] = useState('');
  const [emailSucesso, setEmailSucesso] = useState('');
  const [emailLog, setEmailLog] = useState<EnvioLog[]>([]);
  const [carregandoLog, setCarregandoLog] = useState(false);
  const [novoItemParamsOpen, setNovoItemParamsOpen] = useState(false);
  const [novoItemParams, setNovoItemParams] = useState({
    equipamento_codigo: '',
    markup_percentual: '',
    impostos_percentual: '',
    taxa_marketplace: 'VENDA_DIRETA',
    taxa_percentual: '0',
    embalagem_valor: '',
    custos_extras_valor: '',
  });
  const [calculandoNovoItem, setCalculandoNovoItem] = useState(false);
  const [salvandoValorCodigo, setSalvandoValorCodigo] = useState<number | null>(null);

  const [materiaisPendente, setMateriaisPendente] = useState<ItemMaterial[]>([]);
  const [materiaisExistente, setMateriaisExistente] = useState<ItemMaterial[]>([]);
  const [trocarMaterialAlvo, setTrocarMaterialAlvo] = useState<{
    contexto: 'pendente' | 'existente' | 'salvo';
    index: number;
  } | null>(null);
  const [editandoCoresItem, setEditandoCoresItem] = useState<ItemOrcamento | null>(null);
  const [materiaisEdicaoItem, setMateriaisEdicaoItem] = useState<ItemMaterial[]>([]);
  const [salvandoCoresItem, setSalvandoCoresItem] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState<Produto | null>(null);
  const [lotesPorMateriaPrima, setLotesPorMateriaPrima] = useState<Record<number, LoteEstoque[]>>({});

  const orcamentosFiltrados = orcamentos.filter((o) => {
    const q = busca.toLowerCase();
    return o.status === status && o.cliente_nome.toLowerCase().includes(q);
  });

  const totalPendente = itensPendentes.reduce(
    (soma, item) =>
      soma + Number(item.quantidade || 0) * (Number(String(item.valor_unitario || 0).replace(',', '.')) || 0),
    0
  );

  async function load() {
    const [orcRes, cliRes, prodRes, eqRes, markupRes, mpRes, estoqueRes, consumoRes, filamentoRes, maoObraRes, grupoRes] =
      await Promise.all([
        fetch('/api/orcamentos'),
        fetch('/api/clientes'),
        fetch('/api/produtos'),
        fetch('/api/equipamentos'),
        fetch('/api/markup-padrao'),
        fetch('/api/materia-prima'),
        fetch('/api/estoque'),
        fetch('/api/valor-consumo-hora'),
        fetch('/api/custo-base-filamento'),
        fetch('/api/custo-mao-obra-hora'),
        fetch('/api/grupos-produtos'),
      ]);
    if (orcRes.ok) setOrcamentos(await orcRes.json());
    if (cliRes.ok) setClientes(await cliRes.json());
    if (prodRes.ok) setProdutos(await prodRes.json());
    if (eqRes.ok) setEquipamentos(await eqRes.json());
    if (grupoRes.ok) setGrupos(await grupoRes.json());
    if (mpRes.ok) {
      const mpData: MateriaPrimaPickerItem[] = await mpRes.json();
      setMateriasPrimas(mpData);
      const estoqueData: { codigo: number; saldo: string; reservado: string }[] = estoqueRes.ok
        ? await estoqueRes.json()
        : [];
      const disponivelPorCodigo = new Map(
        estoqueData.map((e) => [e.codigo, (Number(e.saldo) - Number(e.reservado)).toFixed(2)])
      );
      setMateriasPrimasCompletas(
        mpData.map((m) => ({ ...m, estoque: disponivelPorCodigo.get(m.codigo) ?? null }))
      );
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startNew() {
    setEditingCodigo(null);
    setForm({ ...emptyForm, markup_percentual: markupPadrao });
    setItensPendentes([]);
    setNovoItemLocal(emptyNovoItem);
    setMateriaisPendente([]);
    setError('');
    setRaioX(null);
    setModalOpen(true);
  }

  function abrirNovoCliente() {
    setNovoClienteForm({ tipo_pessoa: 'PF', documento: '', nome: '', telefone: '', email: '', endereco: '' });
    setNovoClienteError('');
    setNovoClienteOpen(true);
  }

  function fecharNovoCliente() {
    setNovoClienteOpen(false);
    setNovoClienteError('');
  }

  function handleNovoClienteDocumentoChange(value: string) {
    const masked = novoClienteForm.tipo_pessoa === 'PJ' ? maskCNPJ(value) : maskCPF(value);
    setNovoClienteForm({ ...novoClienteForm, documento: masked });
  }

  async function handleSalvarNovoCliente(e: FormEvent) {
    e.preventDefault();
    setNovoClienteError('');
    setSalvandoCliente(true);
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoClienteForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNovoClienteError(data.error || 'Não foi possível salvar.');
        return;
      }
      const res2 = await fetch('/api/clientes');
      if (res2.ok) setClientes(await res2.json());
      setForm((f) => ({ ...f, cliente_codigo: String(data.codigo) }));
      setNovoClienteOpen(false);
    } finally {
      setSalvandoCliente(false);
    }
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
      consome_estoque: o.consome_estoque !== false,
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
      status,
      observacoes: o.observacoes || '',
      equipamento_codigo: o.equipamento_codigo ? String(o.equipamento_codigo) : '',
      markup_percentual: o.markup_percentual || '',
      impostos_percentual: o.impostos_percentual || '',
      taxa_marketplace: o.taxa_marketplace || 'MANUAL',
      taxa_percentual: o.taxa_percentual || '',
      embalagem_valor: o.embalagem_valor || '',
      custos_extras_valor: o.custos_extras_valor || '',
      consome_estoque: o.consome_estoque !== false,
    });
    setNovoItemLocal(emptyNovoItem);
    setError('');
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
          custo_unitario: '0',
          materiais: item.materiais || [],
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
    setMateriaisPendente([]);
    setError('');
    setRaioX(null);
    setModalOpen(false);
  }

  function loteDisponivel(l: LoteEstoque): number {
    return Number(l.saldo) - Number(l.reservado);
  }

  function lotesComSaldo(lotes: LoteEstoque[]): LoteEstoque[] {
    return lotes.filter((l) => loteDisponivel(l) > 0);
  }

  async function carregarLotesMateriaPrima(materiaPrimaCodigo: number): Promise<LoteEstoque[]> {
    const res = await fetch(`/api/estoque/${materiaPrimaCodigo}`);
    const lotes: LoteEstoque[] = res.ok ? await res.json() : [];
    setLotesPorMateriaPrima((prev) => ({ ...prev, [materiaPrimaCodigo]: lotes }));
    return lotes;
  }

  async function carregarMateriaisProduto(produtoCodigo: number): Promise<ItemMaterial[]> {
    const res = await fetch(`/api/produtos/${produtoCodigo}/materiais`);
    const materiais: ItemMaterial[] = res.ok ? await res.json() : [];
    return Promise.all(
      materiais.map(async (m) => {
        const lotes = lotesComSaldo(await carregarLotesMateriaPrima(m.materia_prima_codigo));
        return { ...m, lote_codigo: lotes.length === 1 ? lotes[0].codigo : null };
      })
    );
  }

  async function handlePickProduto(p: ProdutoPicker) {
    if (pickerFor === 'pendente') {
      setNovoItemLocal({ ...novoItemLocal, produto_codigo: String(p.codigo), quantidade: String(p.quantidade) });
      setMateriaisPendente(await carregarMateriaisProduto(p.codigo));
    } else if (pickerFor === 'existente') {
      setNovoItem({ ...novoItem, produto_codigo: String(p.codigo), quantidade: String(p.quantidade) });
      setMateriaisExistente(await carregarMateriaisProduto(p.codigo));
    }
  }

  async function trocarMaterialCor(mp: MateriaPrimaPickerItem) {
    if (!trocarMaterialAlvo) return;
    const { contexto, index } = trocarMaterialAlvo;
    const lotes = lotesComSaldo(await carregarLotesMateriaPrima(mp.codigo));
    const atualizar = (lista: ItemMaterial[]) =>
      lista.map((m, i) =>
        i === index
          ? {
              ...m,
              materia_prima_codigo: mp.codigo,
              tipo_nome: mp.tipo_nome,
              cor: mp.cor,
              cor_hex: mp.cor_hex,
              unidade_medida_sigla: mp.unidade_medida_sigla,
              lote_codigo: lotes.length === 1 ? lotes[0].codigo : null,
            }
          : m
      );
    if (contexto === 'pendente') setMateriaisPendente((prev) => atualizar(prev));
    else if (contexto === 'existente') setMateriaisExistente((prev) => atualizar(prev));
    else setMateriaisEdicaoItem((prev) => atualizar(prev));
    setTrocarMaterialAlvo(null);
  }

  function handleLoteMaterialChange(contexto: 'pendente' | 'existente' | 'salvo', index: number, loteCodigo: string) {
    const valor = loteCodigo ? Number(loteCodigo) : null;
    const atualizar = (lista: ItemMaterial[]) =>
      lista.map((m, i) => (i === index ? { ...m, lote_codigo: valor } : m));
    if (contexto === 'pendente') setMateriaisPendente((prev) => atualizar(prev));
    else if (contexto === 'existente') setMateriaisExistente((prev) => atualizar(prev));
    else setMateriaisEdicaoItem((prev) => atualizar(prev));
  }

  function renderMateriaisEditor(materiais: ItemMaterial[], contexto: 'pendente' | 'existente' | 'salvo') {
    if (materiais.length === 0) return null;
    return (
      <div className="field" style={{ gridColumn: '1 / -1' }}>
        <label>Materiais / Cores (do cadastro do produto — pode alterar)</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {materiais.map((m, i) => {
            const lotes = lotesComSaldo(lotesPorMateriaPrima[m.materia_prima_codigo] || []);
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      backgroundColor: m.cor_hex,
                      border: '1px solid #e2e8f0',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13 }}>
                    {m.tipo_nome} — {m.cor} · {m.peso} {m.unidade_medida_sigla}
                  </span>
                  <button
                    type="button"
                    className="btn-small"
                    onClick={() => setTrocarMaterialAlvo({ contexto, index: i })}
                  >
                    Trocar cor
                  </button>
                </div>
                <div style={{ marginLeft: 26, fontSize: 12 }}>
                  {lotes.length === 0 && (
                    <span style={{ color: '#dc2626' }}>Sem lote com saldo disponível para esta cor.</span>
                  )}
                  {lotes.length === 1 && (
                    <span style={{ color: '#64748b' }}>
                      Lote #{lotes[0].codigo}: {lotes[0].fornecedor || 'sem fornecedor'} — disponível{' '}
                      {loteDisponivel(lotes[0]).toFixed(2)} {m.unidade_medida_sigla}
                    </span>
                  )}
                  {lotes.length > 1 && (
                    <select
                      value={m.lote_codigo ?? ''}
                      onChange={(e) => handleLoteMaterialChange(contexto, i, e.target.value)}
                      style={{ fontSize: 12, padding: '4px 6px' }}
                    >
                      <option value="">Selecione o lote...</option>
                      {lotes.map((l) => {
                        const custoUnidade =
                          l.valor_custo && Number(l.quantidade_inicial) > 0
                            ? Number(l.valor_custo) / Number(l.quantidade_inicial)
                            : null;
                        return (
                          <option key={l.codigo} value={l.codigo}>
                            #{l.codigo} · {l.fornecedor || 'Sem fornecedor'} — disponível{' '}
                            {loteDisponivel(l).toFixed(2)} {m.unidade_medida_sigla}
                            {custoUnidade !== null ? ` — R$ ${custoUnidade.toFixed(4)}/${m.unidade_medida_sigla}` : ''}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  async function calcularCustoProduto(
    produto: Produto,
    equipamentoCodigo: string,
    materiaisMap?: Map<number, MaterialAgregado>
  ) {
    if (produto.tipo === 'REVENDA') {
      const valor = Number(produto.valor_custo) || 0;
      const detalhe: CustoDetalhado = {
        materiais: [],
        materialCost: valor,
        maoDeObraCost: 0,
        energiaCost: 0,
        custosFixos: [],
        custosFixosCost: 0,
        total: valor,
      };
      return { materialCost: valor, energiaCost: 0, maoDeObraCost: 0, detalhe };
    }

    const equipamentoSelecionado = equipamentos.find((eq) => String(eq.codigo) === equipamentoCodigo);
    const consumoWHora = equipamentoSelecionado ? Number(equipamentoSelecionado.consumo_w_hora) : 0;
    const custoKgPadrao = parseDecimal(custoBaseFilamento) || 0;
    const valorHoraEnergia = parseDecimal(valorConsumoHora) || 0;
    const valorHoraMaoObra = parseDecimal(custoMaoObraHora) || 0;

    const res = await fetch(`/api/produtos/${produto.codigo}/materiais`);
    const materiais: ItemMaterial[] = res.ok ? await res.json() : [];

    let materialCost = 0;
    const materiaisDetalhe: CustoDetalhado['materiais'] = [];
    for (const m of materiais) {
      const mp = materiasPrimas.find((x) => x.codigo === m.materia_prima_codigo);
      const custoKg = mp?.valor_custo ? Number(mp.valor_custo) : custoKgPadrao;
      const pesoNum = Number(m.peso) || 0;
      const custoItem = (pesoNum / 1000) * custoKg;
      materialCost += custoItem;
      materiaisDetalhe.push({
        nome: m.tipo_nome,
        cor: m.cor,
        peso: m.peso,
        unidade: m.unidade_medida_sigla,
        custo: custoItem,
      });

      if (materiaisMap) {
        const existente = materiaisMap.get(m.materia_prima_codigo);
        if (existente) {
          existente.pesoTotal += pesoNum;
        } else {
          materiaisMap.set(m.materia_prima_codigo, {
            materia_prima_codigo: m.materia_prima_codigo,
            nome: `${m.tipo_nome} — ${m.cor}`,
            cor_hex: m.cor_hex || '#cbd5e1',
            pesoTotal: pesoNum,
            unidade: m.unidade_medida_sigla,
          });
        }
      }
    }

    const horasImpressao = (produto.tempo_impressao_segundos || 0) / 3600;
    const horasMaoObra = (produto.tempo_mao_obra_segundos || 0) / 3600;
    const energiaCost = (consumoWHora / 1000) * horasImpressao * valorHoraEnergia;
    const maoDeObraCost = horasMaoObra * valorHoraMaoObra;
    const custosFixos = produto.custos_fixos || [];
    const custosFixosCost = custosFixos.reduce((soma, c) => soma + (Number(c.custo) || 0), 0);

    const detalhe: CustoDetalhado = {
      materiais: materiaisDetalhe,
      materialCost,
      maoDeObraCost,
      energiaCost,
      custosFixos: custosFixos.map((c) => ({ descricao: c.descricao, custo: Number(c.custo) || 0 })),
      custosFixosCost,
      total: materialCost + maoDeObraCost + energiaCost + custosFixosCost,
    };

    return { materialCost: materialCost + custosFixosCost, energiaCost, maoDeObraCost, detalhe };
  }

  function dividirCustoDetalhado(detalhe: CustoDetalhado, divisor: number): CustoDetalhado {
    if (!divisor || divisor === 1) return detalhe;
    return {
      materiais: detalhe.materiais.map((m) => ({ ...m, custo: m.custo / divisor })),
      materialCost: detalhe.materialCost / divisor,
      maoDeObraCost: detalhe.maoDeObraCost / divisor,
      energiaCost: detalhe.energiaCost / divisor,
      custosFixos: detalhe.custosFixos.map((c) => ({ ...c, custo: c.custo / divisor })),
      custosFixosCost: detalhe.custosFixosCost / divisor,
      total: detalhe.total / divisor,
    };
  }

  function formatCustoTooltip(detalhe?: CustoDetalhado, extra?: { embalagem: number; custosExtras: number }): string {
    if (!detalhe) return '';
    const linhas: string[] = [];
    if (detalhe.materiais.length > 0) {
      linhas.push('Materiais:');
      for (const m of detalhe.materiais) {
        linhas.push(`  ${m.nome} — ${m.cor} (${Number(m.peso).toFixed(2)} ${m.unidade}): R$ ${m.custo.toFixed(2)}`);
      }
    }
    if (detalhe.maoDeObraCost > 0) {
      linhas.push(`Mão de obra: R$ ${detalhe.maoDeObraCost.toFixed(2)}`);
    }
    if (detalhe.energiaCost > 0) {
      linhas.push(`Energia: R$ ${detalhe.energiaCost.toFixed(2)}`);
    }
    if (detalhe.custosFixos.length > 0) {
      linhas.push('Custos fixos:');
      for (const c of detalhe.custosFixos) {
        linhas.push(`  ${c.descricao}: R$ ${c.custo.toFixed(2)}`);
      }
    }
    const embalagemExtras = (extra?.embalagem || 0) + (extra?.custosExtras || 0);
    if (embalagemExtras > 0) {
      linhas.push(`Embalagem/Custos extras: R$ ${embalagemExtras.toFixed(2)}`);
    }
    if (linhas.length === 0) return '';
    linhas.push(`Total: R$ ${(detalhe.total + embalagemExtras).toFixed(2)}`);
    return linhas.join('\n');
  }

  async function garantirCustoDetalhadoOrcamento(o: Orcamento) {
    if (custosOrcamentosDetalhado[o.codigo] !== undefined) return;
    const res = await fetch(`/api/orcamentos/${o.codigo}/itens`);
    if (!res.ok) return;
    const itensSalvos: ItemOrcamento[] = await res.json();
    if (itensSalvos.length === 0) {
      setCustosOrcamentosDetalhado((atual) => ({ ...atual, [o.codigo]: null }));
      return;
    }
    const equipamentoCodigo = o.equipamento_codigo ? String(o.equipamento_codigo) : '';
    const detalhes = await Promise.all(
      itensSalvos.map(async (item) => {
        const produto = produtos.find((p) => p.codigo === item.produto_codigo);
        if (!produto) return null;
        const { detalhe } = await calcularCustoProduto(produto, equipamentoCodigo);
        return detalhe || null;
      })
    );
    const agregado: CustoDetalhado = {
      materiais: [],
      materialCost: 0,
      maoDeObraCost: 0,
      energiaCost: 0,
      custosFixos: [],
      custosFixosCost: 0,
      total: 0,
    };
    for (const d of detalhes) {
      if (!d) continue;
      agregado.materiais.push(...d.materiais);
      agregado.materialCost += d.materialCost;
      agregado.maoDeObraCost += d.maoDeObraCost;
      agregado.energiaCost += d.energiaCost;
      agregado.custosFixos.push(...d.custosFixos);
      agregado.custosFixosCost += d.custosFixosCost;
      agregado.total += d.total;
    }
    setCustosOrcamentosDetalhado((atual) => ({ ...atual, [o.codigo]: agregado }));
  }

  async function handleAddItemLocal() {
    setError('');
    const produto = produtos.find((p) => String(p.codigo) === novoItemLocal.produto_codigo);
    if (!produto) {
      setError('Selecione um produto.');
      return;
    }
    setAddingItem(true);
    try {
      const { materialCost, energiaCost, maoDeObraCost, detalhe } = await calcularCustoProduto(
        produto,
        form.equipamento_codigo
      );
      const markup = parseDecimal(form.markup_percentual) || 0;
      const impostos = parseDecimal(form.impostos_percentual) || 0;
      const taxa = parseDecimal(form.taxa_percentual) || 0;
      const embalagem = parseDecimal(form.embalagem_valor) || 0;
      const custosExtras = parseDecimal(form.custos_extras_valor) || 0;

      const custoTotal = materialCost + energiaCost + maoDeObraCost + embalagem + custosExtras;
      const lucro = custoTotal * (markup / 100);
      const precoBase = custoTotal + lucro;
      const percentualFees = (impostos + taxa) / 100;
      const precoVenda = percentualFees < 1 ? precoBase / (1 - percentualFees) : precoBase;
      const custoUnitario = produto.quantidade > 0 ? custoTotal / produto.quantidade : custoTotal;
      const valorUnitario = produto.quantidade > 0 ? precoVenda / produto.quantidade : precoVenda;

      setItensPendentes([
        ...itensPendentes,
        {
          produto_codigo: novoItemLocal.produto_codigo,
          produto_descricao: produto.descricao,
          quantidade: String(produto.quantidade),
          valor_unitario: valorUnitario.toFixed(2),
          custo_unitario: custoUnitario.toFixed(2),
          custo_detalhado: detalhe && produto.quantidade > 0 ? dividirCustoDetalhado(detalhe, produto.quantidade) : detalhe,
          materiais: materiaisPendente,
        },
      ]);
      setNovoItemLocal(emptyNovoItem);
      setMateriaisPendente([]);
      setRaioX(null);
    } finally {
      setAddingItem(false);
    }
  }

  function handleRemoveItemLocal(index: number) {
    setItensPendentes(itensPendentes.filter((_, i) => i !== index));
    setRaioX(null);
  }

  function handleValorUnitarioChange(index: number, value: string) {
    setItensPendentes(
      itensPendentes.map((item, i) => (i === index ? { ...item, valor_unitario: value } : item))
    );
  }

  async function handleRecalcularSalvo(o: Orcamento) {
    setRecalculandoCodigo(o.codigo);
    try {
      const res = await fetch(`/api/orcamentos/${o.codigo}/itens`);
      if (!res.ok) {
        alert('Não foi possível carregar os itens deste orçamento.');
        return;
      }
      const itensSalvos: ItemOrcamento[] = await res.json();
      if (itensSalvos.length === 0) {
        alert('Este orçamento não possui itens para calcular.');
        return;
      }

      const equipamentoCodigo = o.equipamento_codigo ? String(o.equipamento_codigo) : '';
      const materiaisMap = new Map<number, MaterialAgregado>();

      const itensCalculados = await Promise.all(
        itensSalvos.map(async (item) => {
          const produto = produtos.find((p) => p.codigo === item.produto_codigo);
          const quantidade = produto?.quantidade || Number(item.quantidade) || 1;
          if (!produto) {
            return { item, quantidade, materialCost: 0, energiaCost: 0, maoDeObraCost: 0, detalhe: undefined as CustoDetalhado | undefined };
          }
          const { materialCost, energiaCost, maoDeObraCost, detalhe } = await calcularCustoProduto(
            produto,
            equipamentoCodigo,
            materiaisMap
          );
          return { item, quantidade, materialCost, energiaCost, maoDeObraCost, detalhe };
        })
      );

      const embalagem = Number(o.embalagem_valor) || 0;
      const custosExtras = Number(o.custos_extras_valor) || 0;
      const markup = Number(o.markup_percentual) || 0;
      const impostos = Number(o.impostos_percentual) || 0;
      const taxa = Number(o.taxa_percentual) || 0;

      const materialTotal = itensCalculados.reduce((s, i) => s + (i.detalhe ? i.detalhe.materialCost : i.materialCost), 0);
      const energiaTotal = itensCalculados.reduce((s, i) => s + i.energiaCost, 0);
      const maoDeObraTotal = itensCalculados.reduce((s, i) => s + i.maoDeObraCost, 0);
      const custosFixosTotal = itensCalculados.reduce((s, i) => s + (i.detalhe?.custosFixosCost || 0), 0);
      const custosFixos = itensCalculados.flatMap((i) => i.detalhe?.custosFixos || []);
      const custoIndustrial = materialTotal + custosFixosTotal + energiaTotal + maoDeObraTotal + embalagem + custosExtras;
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
        return { codigo: item.codigo, valor_unitario: valorUnitario.toFixed(2) };
      });

      for (const atualizado of itensAtualizados) {
        await fetch(`/api/orcamentos/${o.codigo}/itens/${atualizado.codigo}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valor_unitario: atualizado.valor_unitario }),
        });
      }

      await fetch(`/api/orcamentos/${o.codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_codigo: o.cliente_codigo,
          data: o.data.slice(0, 10),
          data_entrega: o.data_entrega ? o.data_entrega.slice(0, 10) : '',
          status: o.status,
          observacoes: o.observacoes || '',
          equipamento_codigo: o.equipamento_codigo || '',
          markup_percentual: o.markup_percentual,
          impostos_percentual: o.impostos_percentual,
          taxa_marketplace: o.taxa_marketplace,
          taxa_percentual: o.taxa_percentual,
          embalagem_valor: o.embalagem_valor,
          custos_extras_valor: o.custos_extras_valor,
          valor_sugerido: precoVenda.toFixed(2),
          custo_total: custoIndustrial.toFixed(2),
        }),
      });

      const novoMapaCustos: Record<number, number> = {};
      for (const { item, quantidade, materialCost, energiaCost, maoDeObraCost } of itensCalculados) {
        novoMapaCustos[item.codigo] = quantidade > 0 ? (materialCost + energiaCost + maoDeObraCost) / quantidade : 0;
      }
      setCustosItens(novoMapaCustos);
      setOrcamentos((atual) =>
        atual.map((item) =>
          item.codigo === o.codigo ? { ...item, custo_total: custoIndustrial.toFixed(2) } : item
        )
      );

      setRaioX({
        materialTotal,
        energiaTotal,
        maoDeObraTotal,
        custosFixosTotal,
        custosFixos,
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

      await load();
      if (selecionado && selecionado.codigo === o.codigo) {
        await refreshItens(o.codigo);
      }
    } finally {
      setRecalculandoCodigo(null);
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

    if (!editingCodigo && itensPendentes.length === 0) {
      setError('Adicione ao menos um item antes de criar o orçamento.');
      return;
    }

    setLoading(true);
    try {
      const url = editingCodigo ? `/api/orcamentos/${editingCodigo}` : '/api/orcamentos';
      const method = editingCodigo ? 'PUT' : 'POST';
      const valorSugeridoInicial = !editingCodigo && itensPendentes.length > 0 ? totalPendente.toFixed(2) : undefined;
      const custoTotalInicial =
        !editingCodigo && itensPendentes.length > 0
          ? (
              itensPendentes.reduce(
                (s, item) => s + Number(item.custo_unitario || 0) * Number(item.quantidade || 0),
                0
              ) +
              (parseDecimal(sanitized.embalagem_valor) || 0) +
              (parseDecimal(sanitized.custos_extras_valor) || 0)
            ).toFixed(2)
          : undefined;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sanitized,
          data: sanitized.data || hoje(),
          valor_sugerido: valorSugeridoInicial,
          custo_total: custoTotalInicial,
        }),
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
            body: JSON.stringify({
              ...item,
              valor_unitario: String(item.valor_unitario).replace(',', '.'),
            }),
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

  function abrirPdf(o: Orcamento) {
    window.open(`/dashboard/orcamento-pdf/${o.codigo}`, '_blank');
  }

  async function carregarLogEnvio(codigoOrcamento: number) {
    setCarregandoLog(true);
    try {
      const res = await fetch(`/api/orcamentos/${codigoOrcamento}/enviar-email`);
      if (res.ok) setEmailLog(await res.json());
    } finally {
      setCarregandoLog(false);
    }
  }

  function abrirEnvioEmail(o: Orcamento) {
    const cliente = clientes.find((c) => c.codigo === o.cliente_codigo);
    setEmailOrcamento(o);
    setEmailDestinatario(cliente?.email || '');
    setEmailErro('');
    setEmailSucesso('');
    setEmailLog([]);
    carregarLogEnvio(o.codigo);
  }

  function fecharEnvioEmail() {
    setEmailOrcamento(null);
    setEmailDestinatario('');
    setEmailErro('');
    setEmailSucesso('');
    setEmailLog([]);
  }

  async function handleEnviarEmail() {
    if (!emailOrcamento) return;
    if (!emailDestinatario) {
      setEmailErro('Informe um e-mail de destino.');
      return;
    }
    setEnviandoEmail(true);
    setEmailErro('');
    setEmailSucesso('');
    try {
      const res = await fetch(`/api/orcamentos/${emailOrcamento.codigo}/enviar-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinatario: emailDestinatario }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailErro(data.error || 'Não foi possível enviar o e-mail.');
      } else {
        setEmailSucesso(`Orçamento enviado para ${data.destinatario}.`);
      }
      await carregarLogEnvio(emailOrcamento.codigo);
    } finally {
      setEnviandoEmail(false);
    }
  }

  async function handleStatusChange(o: Orcamento, novoStatus: OrcamentoStatus) {
    setOrcamentos((atual) => atual.map((item) => (item.codigo === o.codigo ? { ...item, status: novoStatus } : item)));
    const res = await fetch(`/api/orcamentos/${o.codigo}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_codigo: o.cliente_codigo,
        data: o.data.slice(0, 10),
        data_entrega: o.data_entrega ? o.data_entrega.slice(0, 10) : '',
        status: novoStatus,
        observacoes: o.observacoes || '',
        equipamento_codigo: o.equipamento_codigo || '',
        markup_percentual: o.markup_percentual,
        impostos_percentual: o.impostos_percentual,
        taxa_marketplace: o.taxa_marketplace,
        taxa_percentual: o.taxa_percentual,
        embalagem_valor: o.embalagem_valor,
        custos_extras_valor: o.custos_extras_valor,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Não foi possível alterar o status.');
      load();
      return;
    }
    load();

    if (novoStatus === 'ENTREGUE' && confirm('Deseja gerar um Contas a Receber para este orçamento?')) {
      const vencimentoPadrao = new Date();
      vencimentoPadrao.setDate(vencimentoPadrao.getDate() + 30);
      setContaReceberOrcamento(o);
      setContaReceberVencimento(vencimentoPadrao.toISOString().slice(0, 10));
    }
  }

  async function handleConfirmarContaReceber() {
    if (!contaReceberOrcamento || !contaReceberVencimento) return;
    setGerandoContaReceber(true);
    try {
      const res = await fetch('/api/contas-receber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orcamento_codigo: contaReceberOrcamento.codigo,
          cliente_codigo: contaReceberOrcamento.cliente_codigo,
          descricao: `Orçamento #${contaReceberOrcamento.codigo} — ${contaReceberOrcamento.cliente_nome}`,
          valor: contaReceberOrcamento.valor_total,
          data_vencimento: contaReceberVencimento,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Não foi possível gerar o Contas a Receber.');
        return;
      }
      setContaReceberOrcamento(null);
    } finally {
      setGerandoContaReceber(false);
    }
  }

  async function calcularCustosItens(itensList: ItemOrcamento[], equipamentoCodigo: string, orcamento?: Orcamento) {
    const novoMapa: Record<number, number> = {};
    const novoDetalhado: Record<number, CustoDetalhado> = {};
    await Promise.all(
      itensList.map(async (item) => {
        const produto = produtos.find((p) => p.codigo === item.produto_codigo);
        if (!produto) return;
        const { materialCost, energiaCost, maoDeObraCost, detalhe } = await calcularCustoProduto(produto, equipamentoCodigo);
        const custoTotal = materialCost + energiaCost + maoDeObraCost;
        const quantidade = Number(item.quantidade) || 1;
        novoMapa[item.codigo] = quantidade > 0 ? custoTotal / quantidade : custoTotal;
        if (detalhe) {
          novoDetalhado[item.codigo] = quantidade > 0 ? dividirCustoDetalhado(detalhe, quantidade) : detalhe;
        }
      })
    );
    setCustosItens(novoMapa);
    setCustosItensDetalhado(novoDetalhado);

    if (orcamento) {
      const embalagem = Number(orcamento.embalagem_valor) || 0;
      const custosExtras = Number(orcamento.custos_extras_valor) || 0;
      const custoTotalOrcamento =
        itensList.reduce((s, item) => s + (novoMapa[item.codigo] || 0) * (Number(item.quantidade) || 0), 0) +
        embalagem +
        custosExtras;

      await fetch(`/api/orcamentos/${orcamento.codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_codigo: orcamento.cliente_codigo,
          data: orcamento.data.slice(0, 10),
          data_entrega: orcamento.data_entrega ? orcamento.data_entrega.slice(0, 10) : '',
          status: orcamento.status,
          observacoes: orcamento.observacoes || '',
          equipamento_codigo: orcamento.equipamento_codigo || '',
          markup_percentual: orcamento.markup_percentual,
          impostos_percentual: orcamento.impostos_percentual,
          taxa_marketplace: orcamento.taxa_marketplace,
          taxa_percentual: orcamento.taxa_percentual,
          embalagem_valor: orcamento.embalagem_valor,
          custos_extras_valor: orcamento.custos_extras_valor,
          custo_total: custoTotalOrcamento.toFixed(2),
        }),
      });
      setOrcamentos((atual) =>
        atual.map((item) =>
          item.codigo === orcamento.codigo ? { ...item, custo_total: custoTotalOrcamento.toFixed(2) } : item
        )
      );
    }
  }

  async function abrirItens(o: Orcamento) {
    setSelecionado(o);
    setItemError('');
    setNovoItem(emptyNovoItem);
    setMateriaisExistente([]);
    setCustosItens({});
    const res = await fetch(`/api/orcamentos/${o.codigo}/itens`);
    if (res.ok) {
      const lista: ItemOrcamento[] = await res.json();
      setItens(lista);
      await calcularCustosItens(lista, o.equipamento_codigo ? String(o.equipamento_codigo) : '', o);
    }
  }

  function fecharItens() {
    setSelecionado(null);
    setItens([]);
    setCustosItens({});
    setMateriaisExistente([]);
  }

  async function abrirEdicaoCores(item: ItemOrcamento) {
    setEditandoCoresItem(item);
    setMateriaisEdicaoItem(item.materiais);
    await Promise.all(item.materiais.map((m) => carregarLotesMateriaPrima(m.materia_prima_codigo)));
  }

  function fecharEdicaoCores() {
    setEditandoCoresItem(null);
    setMateriaisEdicaoItem([]);
  }

  async function handleSalvarCoresItem() {
    if (!selecionado || !editandoCoresItem) return;
    setSalvandoCoresItem(true);
    try {
      const res = await fetch(
        `/api/orcamentos/${selecionado.codigo}/itens/${editandoCoresItem.codigo}/materiais`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            materiais: materiaisEdicaoItem.map((m) => ({
              materia_prima_codigo: m.materia_prima_codigo,
              peso: m.peso,
              lote_codigo: m.lote_codigo || null,
            })),
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Não foi possível salvar as cores.');
        return;
      }
      fecharEdicaoCores();
      await refreshItens(selecionado.codigo);
    } finally {
      setSalvandoCoresItem(false);
    }
  }

  async function refreshItens(codigo: number) {
    const [itensRes, orcRes] = await Promise.all([
      fetch(`/api/orcamentos/${codigo}/itens`),
      fetch('/api/orcamentos'),
    ]);
    let lista: ItemOrcamento[] = [];
    if (itensRes.ok) {
      lista = await itensRes.json();
      setItens(lista);
    }
    let equipamentoCodigo = selecionado?.equipamento_codigo ? String(selecionado.equipamento_codigo) : '';
    let orcamentoAtual: Orcamento | undefined = selecionado || undefined;
    if (orcRes.ok) {
      const listaOrc: Orcamento[] = await orcRes.json();
      setOrcamentos(listaOrc);
      const atual = listaOrc.find((o) => o.codigo === codigo);
      if (atual) {
        setSelecionado(atual);
        equipamentoCodigo = atual.equipamento_codigo ? String(atual.equipamento_codigo) : '';
        orcamentoAtual = atual;
      }
    }
    if (lista.length > 0) await calcularCustosItens(lista, equipamentoCodigo, orcamentoAtual);
  }

  function abrirParametrosNovoItem() {
    if (!novoItem.produto_codigo) {
      setItemError('Selecione um produto.');
      return;
    }
    if (!selecionado) return;
    setNovoItemParams({
      equipamento_codigo: selecionado.equipamento_codigo ? String(selecionado.equipamento_codigo) : '',
      markup_percentual: selecionado.markup_percentual || '0',
      impostos_percentual: selecionado.impostos_percentual || '0',
      taxa_marketplace: selecionado.taxa_marketplace || 'VENDA_DIRETA',
      taxa_percentual: selecionado.taxa_percentual || '0',
      embalagem_valor: selecionado.embalagem_valor || '0',
      custos_extras_valor: selecionado.custos_extras_valor || '0',
    });
    setItemError('');
    setNovoItemParamsOpen(true);
  }

  async function handleCalcularEAdicionarItem() {
    if (!selecionado) return;
    const produto = produtos.find((p) => String(p.codigo) === novoItem.produto_codigo);
    if (!produto) return;
    setCalculandoNovoItem(true);
    try {
      const { materialCost, energiaCost, maoDeObraCost } = await calcularCustoProduto(
        produto,
        novoItemParams.equipamento_codigo
      );
      const markup = parseDecimal(novoItemParams.markup_percentual) || 0;
      const impostos = parseDecimal(novoItemParams.impostos_percentual) || 0;
      const taxa = parseDecimal(novoItemParams.taxa_percentual) || 0;
      const embalagem = parseDecimal(novoItemParams.embalagem_valor) || 0;
      const custosExtras = parseDecimal(novoItemParams.custos_extras_valor) || 0;
      const custoTotal = materialCost + energiaCost + maoDeObraCost + embalagem + custosExtras;
      const lucro = custoTotal * (markup / 100);
      const precoBase = custoTotal + lucro;
      const percentualFees = (impostos + taxa) / 100;
      const precoVenda = percentualFees < 1 ? precoBase / (1 - percentualFees) : precoBase;
      const valorUnitario = produto.quantidade > 0 ? precoVenda / produto.quantidade : precoVenda;

      const res = await fetch(`/api/orcamentos/${selecionado.codigo}/itens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produto_codigo: novoItem.produto_codigo,
          quantidade: String(produto.quantidade),
          valor_unitario: valorUnitario.toFixed(2),
          materiais: materiaisExistente.map((m) => ({
            materia_prima_codigo: m.materia_prima_codigo,
            peso: m.peso,
            lote_codigo: m.lote_codigo || null,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setItemError(data.error || 'Não foi possível adicionar.');
        return;
      }
      setNovoItem(emptyNovoItem);
      setMateriaisExistente([]);
      setNovoItemParamsOpen(false);
      await refreshItens(selecionado.codigo);
    } finally {
      setCalculandoNovoItem(false);
    }
  }

  async function handleDeleteItem(itemCodigo: number) {
    if (!selecionado) return;
    await fetch(`/api/orcamentos/${selecionado.codigo}/itens/${itemCodigo}`, { method: 'DELETE' });
    await refreshItens(selecionado.codigo);
  }

  function handleItemValorChange(itemCodigo: number, value: string) {
    setItens(itens.map((it) => (it.codigo === itemCodigo ? { ...it, valor_unitario: value } : it)));
  }

  async function handleSalvarValorItem(item: ItemOrcamento) {
    if (!selecionado) return;
    setSalvandoValorCodigo(item.codigo);
    try {
      const res = await fetch(`/api/orcamentos/${selecionado.codigo}/itens/${item.codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor_unitario: String(item.valor_unitario).replace(',', '.') }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Não foi possível salvar o valor.');
        return;
      }
      await refreshItens(selecionado.codigo);
    } finally {
      setSalvandoValorCodigo(null);
    }
  }

  const produtoSelecionadoPendente = produtos.find((p) => String(p.codigo) === novoItemLocal.produto_codigo);
  const produtoSelecionadoExistente = produtos.find((p) => String(p.codigo) === novoItem.produto_codigo);

  const custoPct = raioX && raioX.precoVenda > 0 ? (raioX.custoIndustrial / raioX.precoVenda) * 100 : 0;
  const taxaPct = raioX && raioX.precoVenda > 0 ? (raioX.taxasValor / raioX.precoVenda) * 100 : 0;
  const lucroPct = raioX && raioX.precoVenda > 0 ? (raioX.lucro / raioX.precoVenda) * 100 : 0;
  const roiPct = raioX && raioX.custoIndustrial > 0 ? (raioX.lucro / raioX.custoIndustrial) * 100 : 0;

  return (
    <div>
      <div className="page-header">
        <h2>{titulo}</h2>
        <button className="btn-primary" onClick={startNew} style={{ width: 'auto', padding: '10px 20px' }}>
          Novo Orçamento
        </button>
      </div>

      {clientes.length === 0 && (
        <div className="error-msg">
          Cadastre pelo menos um Cliente antes de criar um orçamento.
        </div>
      )}

      <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por cliente..." />

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
              <th>Valor Sugerido</th>
              <th>Valor Escolhido</th>
              <th>Custo Total</th>
              <th>Lucro</th>
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
                <td>
                  <select
                    className={`status-select ${STATUS_SELECT_CLASS[o.status]}`}
                    value={o.status}
                    disabled={Number(o.total_itens) === 0}
                    title={Number(o.total_itens) === 0 ? 'Adicione ao menos um item para alterar o status' : undefined}
                    onChange={(e) => handleStatusChange(o, e.target.value as OrcamentoStatus)}
                  >
                    <option value="ABERTO">{STATUS_LABELS.ABERTO}</option>
                    <option value="APROVADO">{STATUS_LABELS.APROVADO}</option>
                    <option value="REJEITADO">{STATUS_LABELS.REJEITADO}</option>
                    <option value="EM_PRODUCAO">{STATUS_LABELS.EM_PRODUCAO}</option>
                    <option value="FINALIZADO">{STATUS_LABELS.FINALIZADO}</option>
                    <option value="PENDENTE_ENTREGA">{STATUS_LABELS.PENDENTE_ENTREGA}</option>
                    <option value="ENTREGUE">{STATUS_LABELS.ENTREGUE}</option>
                  </select>
                  {Number(o.total_itens) === 0 && (
                    <p className="hint" style={{ margin: '4px 0 0', color: '#dc2626' }}>
                      Sem item vinculado
                    </p>
                  )}
                </td>
                <td>{o.valor_sugerido ? `R$ ${o.valor_sugerido}` : '-'}</td>
                <td>R$ {o.valor_total}</td>
                <td>
                  {o.custo_total !== null && o.custo_total !== undefined ? (
                    <span
                      onMouseEnter={() => garantirCustoDetalhadoOrcamento(o)}
                      title={
                        formatCustoTooltip(custosOrcamentosDetalhado[o.codigo] || undefined, {
                          embalagem: Number(o.embalagem_valor) || 0,
                          custosExtras: Number(o.custos_extras_valor) || 0,
                        }) || 'Passe o mouse para carregar o detalhamento...'
                      }
                      style={{ cursor: 'help', borderBottom: '1px dotted #94a3b8' }}
                    >
                      R$ {Number(o.custo_total).toFixed(2)}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td>
                  {o.custo_total !== null && o.custo_total !== undefined
                    ? `R$ ${(Number(o.valor_total) - Number(o.custo_total)).toFixed(2)}`
                    : '-'}
                </td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" title="Editar" onClick={() => startEdit(o)}>
                      <IconEdit />
                    </button>
                    <button className="icon-btn" title="Copiar" onClick={() => startCopy(o)}>
                      <IconCopy />
                    </button>
                    <button className="icon-btn" title="Itens" onClick={() => abrirItens(o)}>
                      <IconList />
                    </button>
                    <button
                      className="icon-btn"
                      title="Raio X do Preço"
                      onClick={() => handleRecalcularSalvo(o)}
                      disabled={recalculandoCodigo === o.codigo}
                    >
                      <IconCalculator />
                    </button>
                    <button className="icon-btn" title="Abrir PDF" onClick={() => abrirPdf(o)}>
                      <IconFileText />
                    </button>
                    <button className="icon-btn" title="Enviar por E-mail" onClick={() => abrirEnvioEmail(o)}>
                      <IconMail />
                    </button>
                    <button className="icon-btn danger" title="Excluir" onClick={() => handleDelete(o.codigo)}>
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {orcamentosFiltrados.length === 0 && (
              <tr>
                <td colSpan={10}>Nenhum orçamento encontrado.</td>
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
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      value={form.cliente_codigo}
                      onChange={(e) => setForm({ ...form, cliente_codigo: e.target.value })}
                      required
                      style={{ flex: 1 }}
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
                    <button type="button" className="btn-small" onClick={abrirNovoCliente}>
                      Novo Cliente
                    </button>
                  </div>
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
                    onChange={(e) => setForm({ ...form, status: e.target.value as OrcamentoStatus })}
                  >
                    <option value="ABERTO">{STATUS_LABELS.ABERTO}</option>
                    <option value="APROVADO">{STATUS_LABELS.APROVADO}</option>
                    <option value="REJEITADO">{STATUS_LABELS.REJEITADO}</option>
                    <option value="EM_PRODUCAO">{STATUS_LABELS.EM_PRODUCAO}</option>
                    <option value="FINALIZADO">{STATUS_LABELS.FINALIZADO}</option>
                    <option value="PENDENTE_ENTREGA">{STATUS_LABELS.PENDENTE_ENTREGA}</option>
                    <option value="ENTREGUE">{STATUS_LABELS.ENTREGUE}</option>
                  </select>
                </div>
                <div className="field">
                  <label>Consome Estoque?</label>
                  <select
                    value={form.consome_estoque ? 'sim' : 'nao'}
                    onChange={(e) => setForm({ ...form, consome_estoque: e.target.value === 'sim' })}
                  >
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
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
                    onChange={(e) => setForm({ ...form, observacoes: e.target.value.toUpperCase() })}
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
                            <th>Cor</th>
                            <th>Quantidade</th>
                            <th>Valor Custo</th>
                            <th>Valor Unitário</th>
                            <th>Subtotal</th>
                            <th>Lucro</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {itensPendentes.map((item, index) => {
                            const qtd = Number(item.quantidade) || 0;
                            const valorUnit = Number(String(item.valor_unitario).replace(',', '.')) || 0;
                            const custoUnit = Number(item.custo_unitario || 0);
                            const lucroItem = (valorUnit - custoUnit) * qtd;
                            return (
                              <tr key={index}>
                                <td>{item.produto_descricao}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    {item.materiais.map((m) => (
                                      <span
                                        key={m.materia_prima_codigo}
                                        title={`${m.tipo_nome} — ${m.cor}`}
                                        style={{
                                          width: 14,
                                          height: 14,
                                          borderRadius: 4,
                                          backgroundColor: m.cor_hex,
                                          border: '1px solid #e2e8f0',
                                          display: 'inline-block',
                                        }}
                                      />
                                    ))}
                                  </div>
                                </td>
                                <td>{item.quantidade}</td>
                                <td>
                                  <span
                                    title={formatCustoTooltip(item.custo_detalhado) || undefined}
                                    style={{
                                      cursor: item.custo_detalhado ? 'help' : undefined,
                                      borderBottom: item.custo_detalhado ? '1px dotted #94a3b8' : undefined,
                                    }}
                                  >
                                    R$ {custoUnit.toFixed(2)}
                                  </span>
                                </td>
                                <td>
                                  <div className="input-prefix-group" style={{ minWidth: 140 }}>
                                    <span className="input-prefix">R$</span>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={item.valor_unitario}
                                      onChange={(e) => handleValorUnitarioChange(index, e.target.value)}
                                    />
                                  </div>
                                </td>
                                <td>R$ {(qtd * valorUnit).toFixed(2)}</td>
                                <td>R$ {lucroItem.toFixed(2)}</td>
                                <td>
                                  <button
                                    type="button"
                                    className="icon-btn danger"
                                    title="Remover"
                                    onClick={() => handleRemoveItemLocal(index)}
                                  >
                                    <IconTrash />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'right', fontWeight: 600 }}>
                              Total
                            </td>
                            <td style={{ fontWeight: 600 }}>R$ {totalPendente.toFixed(2)}</td>
                            <td style={{ fontWeight: 600 }}>
                              R${' '}
                              {itensPendentes
                                .reduce((s, item) => {
                                  const qtd = Number(item.quantidade) || 0;
                                  const valorUnit = Number(String(item.valor_unitario).replace(',', '.')) || 0;
                                  const custoUnit = Number(item.custo_unitario || 0);
                                  return s + (valorUnit - custoUnit) * qtd;
                                }, 0)
                                .toFixed(2)}
                            </td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="form-grid">
                    <div className="field">
                      <label>Produto</label>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button
                          type="button"
                          className="pricing-select-btn"
                          style={{ flex: 1 }}
                          onClick={() => setPickerFor('pendente')}
                        >
                          {produtoSelecionadoPendente ? (
                            produtoSelecionadoPendente.descricao
                          ) : (
                            <span className="pricing-select-placeholder">Selecionar produto...</span>
                          )}
                        </button>
                        {produtoSelecionadoPendente?.tem_foto && (
                          <img
                            src={`/api/produtos/${produtoSelecionadoPendente.codigo}/foto`}
                            alt={produtoSelecionadoPendente.descricao}
                            className="product-picker-thumb"
                            style={{ cursor: 'zoom-in' }}
                            title="Clique para ampliar"
                            onClick={() => setFotoAmpliada(produtoSelecionadoPendente)}
                          />
                        )}
                      </div>
                    </div>
                    <div className="field">
                      <label>Quantidade (do cadastro do produto)</label>
                      <input value={novoItemLocal.quantidade} disabled />
                    </div>
                    {renderMateriaisEditor(materiaisPendente, 'pendente')}
                  </div>
                  <p className="hint" style={{ marginTop: -4 }}>
                    Custo e valor de venda são calculados automaticamente ao adicionar o item.
                  </p>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <button type="button" className="btn-small" onClick={handleAddItemLocal} disabled={addingItem}>
                      {addingItem ? 'Calculando...' : 'Adicionar item à lista'}
                    </button>
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
            {raioX.custosFixosTotal > 0 && (
              <div className="raiox-line">
                <div>
                  <div className="raiox-line-label">Custos Fixos do Produto</div>
                  <div className="raiox-line-hint">Itens cadastrados no produto (ex: argola, embalagem própria).</div>
                </div>
                <div
                  className="raiox-line-value"
                  title={raioX.custosFixos.map((c) => `${c.descricao}: R$ ${c.custo.toFixed(2)}`).join('\n')}
                  style={{ cursor: 'help', borderBottom: '1px dotted #94a3b8' }}
                >
                  R$ {raioX.custosFixosTotal.toFixed(2)}
                </div>
              </div>
            )}
            <div className="raiox-line">
              <div>
                <div className="raiox-line-label">Embalagem &amp; Custos Extras</div>
                <div className="raiox-line-hint">Caixa, plástico bolha e outros insumos do orçamento.</div>
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

            <div className="raiox-summary">
              <div className="raiox-summary-label">Preço de Venda Sugerido</div>
              <div className="raiox-summary-price">R$ {raioX.precoVenda.toFixed(2)}</div>
              <div className="raiox-summary-stats">
                <div className="raiox-stat">
                  <div className="raiox-stat-value">R$ {raioX.lucro.toFixed(2)}</div>
                  <div className="raiox-stat-label">Lucro Líquido</div>
                </div>
                <div className="raiox-stat">
                  <div className="raiox-stat-value">{roiPct.toFixed(1)}%</div>
                  <div className="raiox-stat-label">ROI</div>
                </div>
                <div className="raiox-stat">
                  <div className="raiox-stat-value">{lucroPct.toFixed(1)}%</div>
                  <div className="raiox-stat-label">Margem Real</div>
                </div>
              </div>
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

      {novoItemParamsOpen && (
        <div className="modal-overlay" onClick={() => setNovoItemParamsOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Parâmetros de Custo do Item</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setNovoItemParamsOpen(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <p className="hint" style={{ marginTop: -8 }}>
              {produtoSelecionadoExistente?.descricao}
            </p>
            <div className="form-grid">
              <div className="field">
                <label>Equipamento de Impressão</label>
                <select
                  value={novoItemParams.equipamento_codigo}
                  onChange={(e) => setNovoItemParams({ ...novoItemParams, equipamento_codigo: e.target.value })}
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
                <label>Markup (%)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={novoItemParams.markup_percentual}
                  onChange={(e) => setNovoItemParams({ ...novoItemParams, markup_percentual: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Impostos (DAS) (%)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={novoItemParams.impostos_percentual}
                  onChange={(e) => setNovoItemParams({ ...novoItemParams, impostos_percentual: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Taxa Marketplace</label>
                <select
                  value={novoItemParams.taxa_marketplace}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNovoItemParams({
                      ...novoItemParams,
                      taxa_marketplace: value,
                      taxa_percentual: value === 'VENDA_DIRETA' ? '0' : novoItemParams.taxa_percentual,
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
                  value={novoItemParams.taxa_percentual}
                  onChange={(e) => setNovoItemParams({ ...novoItemParams, taxa_percentual: e.target.value })}
                  disabled={novoItemParams.taxa_marketplace === 'VENDA_DIRETA'}
                />
              </div>
              <div className="field">
                <label>Embalagem (R$)</label>
                <div className="input-prefix-group">
                  <span className="input-prefix">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={novoItemParams.embalagem_valor}
                    onChange={(e) => setNovoItemParams({ ...novoItemParams, embalagem_valor: e.target.value })}
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
                    value={novoItemParams.custos_extras_valor}
                    onChange={(e) => setNovoItemParams({ ...novoItemParams, custos_extras_valor: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button
                className="btn-primary"
                type="button"
                disabled={calculandoNovoItem}
                onClick={handleCalcularEAdicionarItem}
                style={{ width: 'auto', padding: '10px 20px' }}
              >
                {calculandoNovoItem ? 'Calculando...' : 'Calcular e Adicionar'}
              </button>
              <button type="button" className="btn-small" onClick={() => setNovoItemParamsOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <ProductPicker
        open={pickerFor !== null}
        produtos={produtos}
        grupos={grupos}
        custoBaseFilamento={custoBaseFilamento}
        onSelect={handlePickProduto}
        onClose={() => setPickerFor(null)}
      />

      {novoClienteOpen && (
        <div className="modal-overlay" onClick={fecharNovoCliente}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Novo cliente</h3>
              <button type="button" className="modal-close" onClick={fecharNovoCliente} aria-label="Fechar">
                ×
              </button>
            </div>
            {novoClienteError && <div className="error-msg">{novoClienteError}</div>}
            <form onSubmit={handleSalvarNovoCliente}>
              <div className="form-grid">
                <div className="field">
                  <label>Tipo</label>
                  <select
                    value={novoClienteForm.tipo_pessoa}
                    onChange={(e) =>
                      setNovoClienteForm({
                        ...novoClienteForm,
                        tipo_pessoa: e.target.value as 'PF' | 'PJ',
                        documento: '',
                      })
                    }
                  >
                    <option value="PF">Pessoa Física (CPF)</option>
                    <option value="PJ">Pessoa Jurídica (CNPJ)</option>
                  </select>
                </div>
                <div className="field">
                  <label>{novoClienteForm.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'}</label>
                  <input
                    placeholder={novoClienteForm.tipo_pessoa === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                    value={novoClienteForm.documento}
                    onChange={(e) => handleNovoClienteDocumentoChange(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Nome</label>
                  <input
                    value={novoClienteForm.nome}
                    onChange={(e) => setNovoClienteForm({ ...novoClienteForm, nome: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Telefone</label>
                  <input
                    placeholder="(00) 00000-0000"
                    value={novoClienteForm.telefone}
                    onChange={(e) => setNovoClienteForm({ ...novoClienteForm, telefone: maskTelefone(e.target.value) })}
                  />
                </div>
                <div className="field">
                  <label>E-mail</label>
                  <input
                    type="email"
                    value={novoClienteForm.email}
                    onChange={(e) => setNovoClienteForm({ ...novoClienteForm, email: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Endereço</label>
                  <input
                    value={novoClienteForm.endereco}
                    onChange={(e) => setNovoClienteForm({ ...novoClienteForm, endereco: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={salvandoCliente}
                  style={{ width: 'auto', padding: '10px 20px' }}
                >
                  {salvandoCliente ? 'Salvando...' : 'Adicionar'}
                </button>
                <button type="button" className="btn-small" onClick={fecharNovoCliente}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {contaReceberOrcamento && (
        <div className="modal-overlay" onClick={() => setContaReceberOrcamento(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Gerar Contas a Receber</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setContaReceberOrcamento(null)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <p className="hint" style={{ marginTop: -8 }}>
              Orçamento #{contaReceberOrcamento.codigo} — {contaReceberOrcamento.cliente_nome} — R${' '}
              {contaReceberOrcamento.valor_total}
            </p>
            <div className="field">
              <label>Data de Vencimento</label>
              <input
                type="date"
                value={contaReceberVencimento}
                onChange={(e) => setContaReceberVencimento(e.target.value)}
                required
              />
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button
                className="btn-primary"
                type="button"
                disabled={gerandoContaReceber}
                onClick={handleConfirmarContaReceber}
                style={{ width: 'auto', padding: '10px 20px' }}
              >
                {gerandoContaReceber ? 'Gerando...' : 'Gerar Contas a Receber'}
              </button>
              <button type="button" className="btn-small" onClick={() => setContaReceberOrcamento(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {emailOrcamento && (
        <div className="modal-overlay" onClick={fecharEnvioEmail}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>Enviar Orçamento por E-mail</h3>
              <button type="button" className="modal-close" onClick={fecharEnvioEmail} aria-label="Fechar">
                ×
              </button>
            </div>
            <p className="hint" style={{ marginTop: -8 }}>
              Orçamento #{emailOrcamento.codigo} — {emailOrcamento.cliente_nome}
            </p>
            {emailErro && <div className="error-msg">{emailErro}</div>}
            {emailSucesso && <div className="success-msg">{emailSucesso}</div>}
            <div className="field">
              <label>E-mail de destino</label>
              <input
                type="email"
                value={emailDestinatario}
                onChange={(e) => setEmailDestinatario(e.target.value)}
                placeholder="cliente@exemplo.com"
                required
              />
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button
                className="btn-primary"
                type="button"
                disabled={enviandoEmail}
                onClick={handleEnviarEmail}
                style={{ width: 'auto', padding: '10px 20px' }}
              >
                {enviandoEmail ? 'Enviando...' : 'Enviar'}
              </button>
              <button type="button" className="btn-small" onClick={fecharEnvioEmail}>
                Fechar
              </button>
            </div>

            <h4 style={{ marginTop: 20, marginBottom: 8 }}>Log de Envio</h4>
            {carregandoLog ? (
              <p className="hint">Carregando...</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data/Hora</th>
                      <th>Destinatário</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailLog.map((log) => (
                      <tr key={log.codigo}>
                        <td>{new Date(log.enviado_em).toLocaleString('pt-BR')}</td>
                        <td>{log.destinatario}</td>
                        <td>
                          <span className={`status-badge ${log.sucesso ? 'status-badge-green' : 'status-badge-red'}`}>
                            {log.sucesso ? 'Enviado' : 'Falhou'}
                          </span>
                          {!log.sucesso && log.erro_mensagem && (
                            <div className="hint" style={{ marginTop: 4 }}>
                              {log.erro_mensagem}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {emailLog.length === 0 && (
                      <tr>
                        <td colSpan={3}>Nenhum envio registrado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {selecionado && (
        <div className="modal-overlay" onClick={fecharItens}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 1150 }}>
            <div className="modal-header">
              <h3>
                Itens do orçamento #{selecionado.codigo} — {selecionado.cliente_nome}
                <br />
                <small style={{ color: '#64748b', fontWeight: 400 }}>
                  Total: R$ {selecionado.valor_total}
                </small>
              </h3>
              <button type="button" className="modal-close" onClick={fecharItens} aria-label="Fechar">
                ×
              </button>
            </div>

          {itemError && <div className="error-msg">{itemError}</div>}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Cor</th>
                  <th>Quantidade</th>
                  <th>Valor Custo</th>
                  <th>Valor Unitário</th>
                  <th>Subtotal</th>
                  <th>Lucro</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => {
                  const custoUnit = custosItens[item.codigo];
                  const custoDetalhe = custosItensDetalhado[item.codigo];
                  const lucroItem =
                    custoUnit !== undefined
                      ? (Number(item.valor_unitario) - custoUnit) * (Number(item.quantidade) || 0)
                      : undefined;
                  return (
                    <tr key={item.codigo}>
                      <td>{item.produto_descricao}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {item.materiais.map((m) => (
                            <span
                              key={m.materia_prima_codigo}
                              title={`${m.tipo_nome} — ${m.cor}`}
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: 4,
                                backgroundColor: m.cor_hex,
                                border: '1px solid #e2e8f0',
                                display: 'inline-block',
                              }}
                            />
                          ))}
                        </div>
                      </td>
                      <td>{item.quantidade}</td>
                      <td>
                        {custoUnit !== undefined ? (
                          <span
                            title={formatCustoTooltip(custoDetalhe) || undefined}
                            style={{ cursor: custoDetalhe ? 'help' : undefined, borderBottom: custoDetalhe ? '1px dotted #94a3b8' : undefined }}
                          >
                            R$ {custoUnit.toFixed(2)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        <div className="input-prefix-group" style={{ width: 120 }}>
                          <span className="input-prefix">R$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.valor_unitario}
                            onChange={(e) => handleItemValorChange(item.codigo, e.target.value)}
                          />
                        </div>
                      </td>
                      <td>R$ {Number(item.subtotal).toFixed(2)}</td>
                      <td>{lucroItem !== undefined ? `R$ ${lucroItem.toFixed(2)}` : '-'}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-btn"
                            title="Salvar valor unitário"
                            onClick={() => handleSalvarValorItem(item)}
                            disabled={salvandoValorCodigo === item.codigo}
                          >
                            <IconCheck />
                          </button>
                          {item.materiais.length > 0 && (
                            <button
                              className="icon-btn"
                              title="Alterar cores"
                              onClick={() => abrirEdicaoCores(item)}
                            >
                              <IconPalette />
                            </button>
                          )}
                          <button className="icon-btn danger" title="Remover" onClick={() => handleDeleteItem(item.codigo)}>
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {itens.length === 0 && (
                  <tr>
                    <td colSpan={8}>Nenhum item adicionado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Produto</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  type="button"
                  className="pricing-select-btn"
                  style={{ flex: 1 }}
                  onClick={() => setPickerFor('existente')}
                >
                  {produtoSelecionadoExistente ? (
                    produtoSelecionadoExistente.descricao
                  ) : (
                    <span className="pricing-select-placeholder">Selecionar produto...</span>
                  )}
                </button>
                {produtoSelecionadoExistente?.tem_foto && (
                  <img
                    src={`/api/produtos/${produtoSelecionadoExistente.codigo}/foto`}
                    alt={produtoSelecionadoExistente.descricao}
                    className="product-picker-thumb"
                    style={{ cursor: 'zoom-in' }}
                    title="Clique para ampliar"
                    onClick={() => setFotoAmpliada(produtoSelecionadoExistente)}
                  />
                )}
              </div>
            </div>
            <div className="field">
              <label>Quantidade (do cadastro do produto)</label>
              <input value={novoItem.quantidade} disabled />
            </div>
            {renderMateriaisEditor(materiaisExistente, 'existente')}
          </div>
          <p className="hint" style={{ marginTop: -4 }}>
            Informe os parâmetros de custo para calcular o valor sugerido deste item.
          </p>
            <button type="button" className="btn-small" style={{ marginTop: 8 }} onClick={abrirParametrosNovoItem}>
              Calcular e Adicionar
            </button>
          </div>
        </div>
      )}

      {editandoCoresItem && (
        <div className="modal-overlay" onClick={fecharEdicaoCores}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cores de {editandoCoresItem.produto_descricao}</h3>
              <button type="button" className="modal-close" onClick={fecharEdicaoCores} aria-label="Fechar">
                ×
              </button>
            </div>
            {renderMateriaisEditor(materiaisEdicaoItem, 'salvo')}
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn-primary"
                style={{ width: 'auto', padding: '10px 20px' }}
                onClick={handleSalvarCoresItem}
                disabled={salvandoCoresItem}
              >
                {salvandoCoresItem ? 'Salvando...' : 'Salvar cores'}
              </button>
              <button type="button" className="btn-small" onClick={fecharEdicaoCores}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <MateriaPrimaPicker
        open={trocarMaterialAlvo !== null}
        materiais={materiasPrimasCompletas}
        onSelect={trocarMaterialCor}
        onClose={() => setTrocarMaterialAlvo(null)}
      />

      {fotoAmpliada && (
        <div className="modal-overlay" onClick={() => setFotoAmpliada(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 720, padding: 12, background: 'transparent', boxShadow: 'none' }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button
                type="button"
                className="modal-close"
                style={{ background: '#fff', borderRadius: 8 }}
                onClick={() => setFotoAmpliada(null)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <img
              src={`/api/produtos/${fotoAmpliada.codigo}/foto`}
              alt={fotoAmpliada.descricao}
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
