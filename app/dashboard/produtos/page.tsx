'use client';

import { useEffect, useState, FormEvent } from 'react';
import SearchBox from '../search-box';
import TimeInput, { formatSegundos } from '../time-input';
import { IconEdit, IconCopy, IconTrash, IconList } from '../icons';
import MateriaPrimaPicker from '../materia-prima-picker';

interface ProdutoMaterialResumo {
  materia_prima_codigo: number;
  nome: string;
  cor: string;
  cor_hex: string;
  peso: string;
  unidade_medida_sigla: string;
  valor_custo: string | null;
}

interface CustoFixoResumo {
  codigo: number;
  descricao: string;
  custo: string;
}

interface Produto {
  codigo: number;
  descricao: string;
  link_stl: string | null;
  stl_nome: string | null;
  tem_foto: boolean;
  quantidade: number;
  tempo_impressao_segundos: number;
  tempo_mao_obra_segundos: number;
  tipo: 'IMPRESSAO' | 'REVENDA';
  valor_custo: string | null;
  grupo_codigo: number | null;
  grupo_nome: string | null;
  materiais: ProdutoMaterialResumo[];
  custos_fixos: CustoFixoResumo[];
}

interface Grupo {
  codigo: number;
  nome: string;
}

interface MateriaPrima {
  codigo: number;
  tipo_codigo: number;
  tipo_nome: string;
  cor: string;
  cor_hex: string;
  unidade_medida_sigla: string;
  valor_custo: string | null;
  fornecedor: string | null;
}

interface ItemMaterial {
  codigo: number;
  materia_prima_codigo: number;
  tipo_nome: string;
  cor: string;
  unidade_medida_sigla: string;
  peso: string;
}

const emptyForm = {
  descricao: '',
  link_stl: '',
  fotoBase64: '',
  fotoTipo: '',
  fotoPreview: '',
  stlNomeAtual: '' as string | null,
  quantidade: 1,
  tempoImpressaoSegundos: 0,
  tempoMaoObraSegundos: 0,
  tipo: 'IMPRESSAO' as Produto['tipo'],
  valorCusto: '',
  grupoCodigo: '',
  removerFoto: false,
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrima[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [stlFile, setStlFile] = useState<File | null>(null);
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [custoBaseFilamento, setCustoBaseFilamento] = useState('0');
  const [custoMaoObraHora, setCustoMaoObraHora] = useState('0');
  const [fotoAmpliadaAberta, setFotoAmpliadaAberta] = useState(false);
  const [fotoTabelaAmpliada, setFotoTabelaAmpliada] = useState<Produto | null>(null);

  const [selecionado, setSelecionado] = useState<Produto | null>(null);
  const [itensMaterial, setItensMaterial] = useState<ItemMaterial[]>([]);
  const [novoMaterial, setNovoMaterial] = useState({ materia_prima_codigo: '', peso: '' });
  const [materialError, setMaterialError] = useState('');
  const [materiaPickerOpen, setMateriaPickerOpen] = useState(false);
  const [custosFixos, setCustosFixos] = useState<CustoFixoResumo[]>([]);
  const [novoCustoFixo, setNovoCustoFixo] = useState({ descricao: '', custo: '' });
  const [custoFixoError, setCustoFixoError] = useState('');

  const produtosFiltrados = produtos.filter(
    (p) =>
      p.descricao.toLowerCase().includes(busca.toLowerCase()) &&
      (!filtroGrupo || String(p.grupo_codigo) === filtroGrupo)
  );

  async function load() {
    const [prodRes, mpRes, filamentoRes, maoObraRes, grupoRes] = await Promise.all([
      fetch('/api/produtos'),
      fetch('/api/materia-prima'),
      fetch('/api/custo-base-filamento'),
      fetch('/api/custo-mao-obra-hora'),
      fetch('/api/grupos-produtos'),
    ]);
    if (prodRes.ok) setProdutos(await prodRes.json());
    if (mpRes.ok) setMateriasPrimas(await mpRes.json());
    if (grupoRes.ok) setGrupos(await grupoRes.json());
    if (filamentoRes.ok) {
      const data = await filamentoRes.json();
      setCustoBaseFilamento(data.valor !== null ? String(data.valor) : '0');
    }
    if (maoObraRes.ok) {
      const data = await maoObraRes.json();
      setCustoMaoObraHora(data.valor_hora !== null ? String(data.valor_hora) : '0');
    }
  }

  function custoPrevioDetalhado(p: Produto) {
    const custoKgPadrao = Number(custoBaseFilamento) || 0;
    const custoHoraMaoObra = Number(custoMaoObraHora) || 0;
    const materiais = p.materiais || [];
    const materialCost = materiais.reduce((soma, m) => {
      const custoKg = m.valor_custo ? Number(m.valor_custo) : custoKgPadrao;
      return soma + (Number(m.peso) / 1000) * custoKg;
    }, 0);
    const maoDeObraCost = ((p.tempo_mao_obra_segundos || 0) / 3600) * custoHoraMaoObra;
    const custosFixos = p.custos_fixos || [];
    const custosFixosCost = custosFixos.reduce((soma, c) => soma + (Number(c.custo) || 0), 0);
    return {
      materiais,
      materialCost,
      maoDeObraCost,
      custosFixos,
      custosFixosCost,
      total: materialCost + maoDeObraCost + custosFixosCost,
    };
  }

  function custoPrevio(p: Produto): number {
    return custoPrevioDetalhado(p).total;
  }

  function custoPrevioTooltip(p: Produto): string {
    const d = custoPrevioDetalhado(p);
    const linhas: string[] = [];
    if (d.materiais.length > 0) {
      linhas.push('Materiais:');
      for (const m of d.materiais) {
        const custoKg = m.valor_custo ? Number(m.valor_custo) : Number(custoBaseFilamento) || 0;
        const custoItem = (Number(m.peso) / 1000) * custoKg;
        linhas.push(`  ${m.nome} — ${m.cor} (${m.peso} ${m.unidade_medida_sigla}): R$ ${custoItem.toFixed(2)}`);
      }
    }
    if (d.maoDeObraCost > 0) {
      linhas.push(`Mão de obra: R$ ${d.maoDeObraCost.toFixed(2)}`);
    }
    if (d.custosFixos.length > 0) {
      linhas.push('Custos fixos:');
      for (const c of d.custosFixos) {
        linhas.push(`  ${c.descricao}: R$ ${Number(c.custo).toFixed(2)}`);
      }
    }
    if (linhas.length === 0) {
      return 'Nenhum material, mão de obra ou custo fixo cadastrado.';
    }
    linhas.push(`Total: R$ ${d.total.toFixed(2)}`);
    return linhas.join('\n');
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setEditingCodigo(null);
    setForm(emptyForm);
    setStlFile(null);
    setError('');
    setModalOpen(true);
  }

  function startEdit(p: Produto) {
    setEditingCodigo(p.codigo);
    setForm({
      descricao: p.descricao,
      link_stl: p.link_stl || '',
      fotoBase64: '',
      fotoTipo: '',
      fotoPreview: p.tem_foto ? `/api/produtos/${p.codigo}/foto` : '',
      stlNomeAtual: p.stl_nome,
      quantidade: p.quantidade,
      tempoImpressaoSegundos: p.tempo_impressao_segundos,
      tempoMaoObraSegundos: p.tempo_mao_obra_segundos,
      tipo: p.tipo,
      valorCusto: p.valor_custo || '',
      grupoCodigo: p.grupo_codigo ? String(p.grupo_codigo) : '',
      removerFoto: false,
    });
    setStlFile(null);
    setError('');
    setModalOpen(true);
  }

  async function startCopy(p: Produto) {
    setEditingCodigo(null);
    setError('');

    let fotoBase64 = '';
    let fotoTipo = '';
    let fotoPreview = '';
    if (p.tem_foto) {
      const res = await fetch(`/api/produtos/${p.codigo}/foto`);
      if (res.ok) {
        const blob = await res.blob();
        fotoTipo = blob.type;
        fotoBase64 = await blobToBase64(blob);
        fotoPreview = `data:${blob.type};base64,${fotoBase64}`;
      }
    }

    setForm({
      descricao: `${p.descricao} (cópia)`,
      link_stl: p.link_stl || '',
      fotoBase64,
      fotoTipo,
      fotoPreview,
      stlNomeAtual: null,
      quantidade: p.quantidade,
      tempoImpressaoSegundos: p.tempo_impressao_segundos,
      tempoMaoObraSegundos: p.tempo_mao_obra_segundos,
      tipo: p.tipo,
      valorCusto: p.valor_custo || '',
      grupoCodigo: p.grupo_codigo ? String(p.grupo_codigo) : '',
      removerFoto: false,
    });

    setStlFile(null);
    if (p.stl_nome) {
      const res = await fetch(`/api/produtos/${p.codigo}/stl`);
      if (res.ok) {
        const blob = await res.blob();
        setStlFile(new File([blob], p.stl_nome, { type: blob.type || 'application/octet-stream' }));
      }
    }

    setModalOpen(true);
  }

  function cancelEdit() {
    setEditingCodigo(null);
    setForm(emptyForm);
    setStlFile(null);
    setError('');
    setModalOpen(false);
  }

  function handleFotoChange(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('O arquivo colado/selecionado precisa ser uma imagem.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('A foto deve ter no máximo 4MB.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [, base64] = dataUrl.split(',');
      setForm((f) => ({ ...f, fotoBase64: base64, fotoTipo: file.type, fotoPreview: dataUrl, removerFoto: false }));
    };
    reader.readAsDataURL(file);
  }

  function handleFotoPaste(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
    if (item) {
      e.preventDefault();
      handleFotoChange(item.getAsFile());
    }
  }

  function handleRemoverFoto() {
    setForm((f) => ({ ...f, fotoBase64: '', fotoTipo: '', fotoPreview: '', removerFoto: true }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = editingCodigo ? `/api/produtos/${editingCodigo}` : '/api/produtos';
      const method = editingCodigo ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: form.descricao,
          link_stl: form.link_stl,
          foto_base64: form.fotoBase64 || undefined,
          foto_tipo: form.fotoTipo || undefined,
          remover_foto: form.removerFoto,
          quantidade: form.quantidade,
          tempo_impressao_segundos: form.tempoImpressaoSegundos,
          tempo_mao_obra_segundos: form.tempoMaoObraSegundos,
          tipo: form.tipo,
          valor_custo: form.valorCusto.replace(',', '.'),
          grupo_codigo: form.grupoCodigo || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Não foi possível salvar.');
        return;
      }

      if (stlFile) {
        const codigo = editingCodigo || data.codigo;
        const fd = new FormData();
        fd.append('arquivo', stlFile);
        const stlRes = await fetch(`/api/produtos/${codigo}/stl`, { method: 'POST', body: fd });
        if (!stlRes.ok) {
          const stlData = await stlRes.json().catch(() => ({}));
          setError(stlData.error || 'Produto salvo, mas não foi possível enviar o arquivo STL.');
          load();
          return;
        }
      }

      cancelEdit();
      load();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(codigo: number) {
    if (!confirm('Excluir este produto?')) return;
    const res = await fetch(`/api/produtos/${codigo}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Não foi possível excluir.');
      return;
    }
    load();
  }

  async function abrirMateriais(p: Produto) {
    setSelecionado(p);
    setMaterialError('');
    setCustoFixoError('');
    setNovoMaterial({ materia_prima_codigo: '', peso: '' });
    setNovoCustoFixo({ descricao: '', custo: '' });
    const [res, res2] = await Promise.all([
      fetch(`/api/produtos/${p.codigo}/materiais`),
      fetch(`/api/produtos/${p.codigo}/custos-fixos`),
    ]);
    if (res.ok) setItensMaterial(await res.json());
    if (res2.ok) setCustosFixos(await res2.json());
  }

  function fecharMateriais() {
    setSelecionado(null);
    setItensMaterial([]);
    setCustosFixos([]);
    load();
  }

  async function handleAddMaterial(e: FormEvent) {
    e.preventDefault();
    if (!selecionado) return;
    setMaterialError('');
    const res = await fetch(`/api/produtos/${selecionado.codigo}/materiais`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoMaterial),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMaterialError(data.error || 'Não foi possível adicionar.');
      return;
    }
    setNovoMaterial({ materia_prima_codigo: '', peso: '' });
    const res2 = await fetch(`/api/produtos/${selecionado.codigo}/materiais`);
    if (res2.ok) setItensMaterial(await res2.json());
  }

  async function handleDeleteMaterial(itemCodigo: number) {
    if (!selecionado) return;
    await fetch(`/api/produtos/${selecionado.codigo}/materiais/${itemCodigo}`, { method: 'DELETE' });
    const res = await fetch(`/api/produtos/${selecionado.codigo}/materiais`);
    if (res.ok) setItensMaterial(await res.json());
  }

  async function handleAddCustoFixo(e: FormEvent) {
    e.preventDefault();
    if (!selecionado) return;
    setCustoFixoError('');
    const res = await fetch(`/api/produtos/${selecionado.codigo}/custos-fixos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        descricao: novoCustoFixo.descricao,
        custo: novoCustoFixo.custo.replace(',', '.'),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setCustoFixoError(data.error || 'Não foi possível adicionar.');
      return;
    }
    setNovoCustoFixo({ descricao: '', custo: '' });
    const res2 = await fetch(`/api/produtos/${selecionado.codigo}/custos-fixos`);
    if (res2.ok) setCustosFixos(await res2.json());
  }

  async function handleDeleteCustoFixo(itemCodigo: number) {
    if (!selecionado) return;
    await fetch(`/api/produtos/${selecionado.codigo}/custos-fixos/${itemCodigo}`, { method: 'DELETE' });
    const res = await fetch(`/api/produtos/${selecionado.codigo}/custos-fixos`);
    if (res.ok) setCustosFixos(await res.json());
  }

  return (
    <div>
      <div className="page-header">
        <h2>Cadastro de Produto</h2>
        <button className="btn-primary" onClick={startNew} style={{ width: 'auto', padding: '10px 20px' }}>
          Novo Produto
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por descrição..." />
        </div>
        <select
          value={filtroGrupo}
          onChange={(e) => setFiltroGrupo(e.target.value)}
          style={{ maxWidth: 220 }}
        >
          <option value="">Todos os grupos</option>
          {grupos.map((g) => (
            <option key={g.codigo} value={g.codigo}>
              {g.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Foto</th>
              <th>Código</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Grupo</th>
              <th>Qtd</th>
              <th>Tempo Impressão</th>
              <th>Tempo Mão de Obra</th>
              <th>Valor Custo</th>
              <th>Custo Prévio</th>
              <th>STL</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {produtosFiltrados.map((p) => (
              <tr key={p.codigo}>
                <td>
                  {p.tem_foto ? (
                    <img
                      src={`/api/produtos/${p.codigo}/foto`}
                      alt={p.descricao}
                      style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, cursor: 'zoom-in' }}
                      title="Clique para ampliar"
                      onClick={() => setFotoTabelaAmpliada(p)}
                    />
                  ) : (
                    '-'
                  )}
                </td>
                <td>{p.codigo}</td>
                <td>
                  <span
                    className={`status-badge ${p.tipo === 'REVENDA' ? 'status-badge-purple' : 'status-badge-blue'}`}
                  >
                    {p.tipo === 'REVENDA' ? 'Revenda' : 'Impressão'}
                  </span>
                </td>
                <td>{p.descricao}</td>
                <td>{p.grupo_nome || '-'}</td>
                <td>{p.quantidade}</td>
                <td>{p.tipo === 'REVENDA' ? '-' : formatSegundos(p.tempo_impressao_segundos)}</td>
                <td>{p.tipo === 'REVENDA' ? '-' : formatSegundos(p.tempo_mao_obra_segundos)}</td>
                <td>{p.tipo === 'REVENDA' ? `R$ ${p.valor_custo || '0.00'}` : '-'}</td>
                <td>
                  {p.tipo === 'IMPRESSAO' ? (
                    <span title={custoPrevioTooltip(p)} style={{ cursor: 'help', borderBottom: '1px dotted #94a3b8' }}>
                      R$ {custoPrevio(p).toFixed(2)}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td>
                  {p.stl_nome && (
                    <a href={`/api/produtos/${p.codigo}/stl`}>{p.stl_nome}</a>
                  )}
                  {p.stl_nome && p.link_stl && <br />}
                  {p.link_stl && (
                    <a href={p.link_stl} target="_blank" rel="noreferrer">
                      Link externo
                    </a>
                  )}
                  {!p.stl_nome && !p.link_stl && '-'}
                </td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" title="Editar" onClick={() => startEdit(p)}>
                      <IconEdit />
                    </button>
                    <button className="icon-btn" title="Copiar" onClick={() => startCopy(p)}>
                      <IconCopy />
                    </button>
                    {p.tipo === 'IMPRESSAO' && (
                      <button className="icon-btn" title="Materiais e Custos Fixos" onClick={() => abrirMateriais(p)}>
                        <IconList />
                      </button>
                    )}
                    <button className="icon-btn danger" title="Excluir" onClick={() => handleDelete(p.codigo)}>
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {produtosFiltrados.length === 0 && (
              <tr>
                <td colSpan={12}>Nenhum produto encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCodigo ? 'Editar produto' : 'Novo produto'}</h3>
              <button type="button" className="modal-close" onClick={cancelEdit} aria-label="Fechar">
                ×
              </button>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label>Tipo de Produto</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value as Produto['tipo'] })}
                  >
                    <option value="IMPRESSAO">Impressão 3D</option>
                    <option value="REVENDA">Revenda (não impresso)</option>
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
                  <label>Grupo</label>
                  <select
                    value={form.grupoCodigo}
                    onChange={(e) => setForm({ ...form, grupoCodigo: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {grupos.map((g) => (
                      <option key={g.codigo} value={g.codigo}>
                        {g.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.quantidade}
                    onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })}
                    required
                  />
                  <p className="hint">Quantas unidades este cadastro representa (ex: kit com 2 itens).</p>
                </div>
                {form.tipo === 'REVENDA' && (
                  <div className="field">
                    <label>Valor de Custo (R$)</label>
                    <div className="input-prefix-group">
                      <span className="input-prefix">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.valorCusto}
                        onChange={(e) => setForm({ ...form, valorCusto: e.target.value })}
                        required
                      />
                    </div>
                    <p className="hint">Custo de compra da quantidade informada acima.</p>
                  </div>
                )}
                {form.tipo === 'IMPRESSAO' && (
                  <>
                    <div className="field">
                      <label>Link do STL (se houver)</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={form.link_stl}
                        onChange={(e) => setForm({ ...form, link_stl: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Arquivo STL da impressão</label>
                      <input
                        type="file"
                        accept=".stl"
                        onChange={(e) => setStlFile(e.target.files?.[0] || null)}
                      />
                      {form.stlNomeAtual && !stlFile && (
                        <p className="hint">Arquivo atual: {form.stlNomeAtual}</p>
                      )}
                      {stlFile && <p className="hint">Arquivo selecionado: {stlFile.name}</p>}
                      <p className="hint">Máximo 50MB.</p>
                    </div>
                  </>
                )}
                <div className="field">
                  <label>Foto</label>
                  <div className="paste-zone" tabIndex={0} onPaste={handleFotoPaste}>
                    {form.fotoPreview ? (
                      <img
                        src={form.fotoPreview}
                        alt="Prévia"
                        className="paste-zone-preview"
                        style={{ cursor: 'zoom-in' }}
                        onClick={() => setFotoAmpliadaAberta(true)}
                        title="Clique para ampliar"
                      />
                    ) : (
                      <span className="hint" style={{ margin: 0 }}>
                        Clique aqui e pressione Ctrl+V para colar uma imagem
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFotoChange(e.target.files?.[0] || null)}
                    />
                    {form.fotoPreview && (
                      <button type="button" className="btn-small danger" onClick={handleRemoverFoto}>
                        Remover foto
                      </button>
                    )}
                  </div>
                  <p className="hint">Máximo 4MB. Deixe em branco para manter a foto atual.</p>
                </div>
              </div>

              {form.tipo === 'IMPRESSAO' && (
                <div className="form-grid" style={{ marginTop: 16 }}>
                  <div className="field">
                    <label>Tempo de Impressão</label>
                    <TimeInput
                      value={form.tempoImpressaoSegundos}
                      onChange={(segundos) => setForm({ ...form, tempoImpressaoSegundos: segundos })}
                    />
                  </div>
                  <div className="field">
                    <label>Tempo Mão de Obra</label>
                    <TimeInput
                      value={form.tempoMaoObraSegundos}
                      onChange={(segundos) => setForm({ ...form, tempoMaoObraSegundos: segundos })}
                    />
                  </div>
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

      {fotoAmpliadaAberta && form.fotoPreview && (
        <div className="modal-overlay" onClick={() => setFotoAmpliadaAberta(false)}>
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
                onClick={() => setFotoAmpliadaAberta(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <img
              src={form.fotoPreview}
              alt="Foto ampliada"
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }}
            />
          </div>
        </div>
      )}

      {fotoTabelaAmpliada && (
        <div className="modal-overlay" onClick={() => setFotoTabelaAmpliada(null)}>
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
                onClick={() => setFotoTabelaAmpliada(null)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <img
              src={`/api/produtos/${fotoTabelaAmpliada.codigo}/foto`}
              alt={fotoTabelaAmpliada.descricao}
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }}
            />
          </div>
        </div>
      )}

      {selecionado && (
        <div className="modal-overlay" onClick={fecharMateriais}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900 }}>
            <div className="modal-header">
              <h3>Materiais e Custos Fixos de {selecionado.descricao}</h3>
              <button type="button" className="modal-close" onClick={fecharMateriais} aria-label="Fechar">
                ×
              </button>
            </div>

            <h4 style={{ marginBottom: 8 }}>Materiais</h4>
            {materialError && <div className="error-msg">{materialError}</div>}

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Matéria Prima</th>
                    <th>Peso</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {itensMaterial.map((item) => (
                    <tr key={item.codigo}>
                      <td>
                        {item.tipo_nome} — {item.cor}
                      </td>
                      <td>
                        {item.peso} {item.unidade_medida_sigla}
                      </td>
                      <td>
                        <button className="btn-small danger" onClick={() => handleDeleteMaterial(item.codigo)}>
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                  {itensMaterial.length === 0 && (
                    <tr>
                      <td colSpan={3}>Nenhum material adicionado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <form onSubmit={handleAddMaterial}>
              <div className="form-grid">
                <div className="field">
                  <label>Matéria Prima</label>
                  <button
                    type="button"
                    className="pricing-select-btn"
                    onClick={() => setMateriaPickerOpen(true)}
                  >
                    {novoMaterial.materia_prima_codigo ? (
                      (() => {
                        const mp = materiasPrimas.find(
                          (m) => String(m.codigo) === novoMaterial.materia_prima_codigo
                        );
                        return mp ? (
                          <>
                            <span
                              style={{
                                display: 'inline-block',
                                width: 16,
                                height: 16,
                                borderRadius: 4,
                                backgroundColor: mp.cor_hex,
                                border: '1px solid #e2e8f0',
                                flexShrink: 0,
                              }}
                            />
                            {mp.tipo_nome} — {mp.cor}
                          </>
                        ) : (
                          'Selecionar matéria prima...'
                        );
                      })()
                    ) : (
                      <span className="pricing-select-placeholder">Selecionar matéria prima...</span>
                    )}
                  </button>
                </div>
                <div className="field">
                  <label>Peso</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={novoMaterial.peso}
                    onChange={(e) => setNovoMaterial({ ...novoMaterial, peso: e.target.value })}
                    required
                  />
                </div>
              </div>
              <button className="btn-small" type="submit" style={{ marginTop: 8 }}>
                Adicionar material
              </button>
            </form>

            <h4 style={{ marginTop: 24, marginBottom: 8 }}>Custos Fixos</h4>
            <p className="hint" style={{ marginTop: -4 }}>
              Custos extras que compõem o produto (ex: argola, embalagem, acessório comprado pronto).
            </p>
            {custoFixoError && <div className="error-msg">{custoFixoError}</div>}

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Custo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {custosFixos.map((item) => (
                    <tr key={item.codigo}>
                      <td>{item.descricao}</td>
                      <td>R$ {Number(item.custo).toFixed(2)}</td>
                      <td>
                        <button className="btn-small danger" onClick={() => handleDeleteCustoFixo(item.codigo)}>
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                  {custosFixos.length === 0 && (
                    <tr>
                      <td colSpan={3}>Nenhum custo fixo adicionado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <form onSubmit={handleAddCustoFixo}>
              <div className="form-grid">
                <div className="field">
                  <label>Descrição</label>
                  <input
                    value={novoCustoFixo.descricao}
                    onChange={(e) => setNovoCustoFixo({ ...novoCustoFixo, descricao: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Custo</label>
                  <div className="input-prefix-group">
                    <span className="input-prefix">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={novoCustoFixo.custo}
                      onChange={(e) => setNovoCustoFixo({ ...novoCustoFixo, custo: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <button className="btn-small" type="submit" style={{ marginTop: 8 }}>
                Adicionar custo fixo
              </button>
            </form>
          </div>
        </div>
      )}

      <MateriaPrimaPicker
        open={materiaPickerOpen}
        materiais={materiasPrimas}
        onSelect={(mp) => setNovoMaterial({ ...novoMaterial, materia_prima_codigo: String(mp.codigo) })}
        onClose={() => setMateriaPickerOpen(false)}
      />
    </div>
  );
}
