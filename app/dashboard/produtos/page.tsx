'use client';

import { useEffect, useState, FormEvent } from 'react';
import SearchBox from '../search-box';

interface Produto {
  codigo: number;
  descricao: string;
  link_stl: string | null;
  stl_nome: string | null;
  tem_foto: boolean;
}

interface MateriaPrima {
  codigo: number;
  tipo_codigo: number;
  tipo_nome: string;
  marca: string;
  cor: string;
  unidade_medida_sigla: string;
}

interface ItemMaterial {
  codigo: number;
  materia_prima_codigo: number;
  tipo_nome: string;
  marca: string;
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
};

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrima[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [stlFile, setStlFile] = useState<File | null>(null);
  const [editingCodigo, setEditingCodigo] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const [selecionado, setSelecionado] = useState<Produto | null>(null);
  const [itensMaterial, setItensMaterial] = useState<ItemMaterial[]>([]);
  const [novoMaterial, setNovoMaterial] = useState({ materia_prima_codigo: '', peso: '' });
  const [materialError, setMaterialError] = useState('');

  const produtosFiltrados = produtos.filter((p) =>
    p.descricao.toLowerCase().includes(busca.toLowerCase())
  );

  async function load() {
    const [prodRes, mpRes] = await Promise.all([
      fetch('/api/produtos'),
      fetch('/api/materia-prima'),
    ]);
    if (prodRes.ok) setProdutos(await prodRes.json());
    if (mpRes.ok) setMateriasPrimas(await mpRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(p: Produto) {
    setEditingCodigo(p.codigo);
    setForm({
      descricao: p.descricao,
      link_stl: p.link_stl || '',
      fotoBase64: '',
      fotoTipo: '',
      fotoPreview: p.tem_foto ? `/api/produtos/${p.codigo}/foto` : '',
      stlNomeAtual: p.stl_nome,
    });
    setStlFile(null);
    setError('');
  }

  function cancelEdit() {
    setEditingCodigo(null);
    setForm(emptyForm);
    setStlFile(null);
    setError('');
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
      setForm((f) => ({ ...f, fotoBase64: base64, fotoTipo: file.type, fotoPreview: dataUrl }));
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
    setNovoMaterial({ materia_prima_codigo: '', peso: '' });
    const res = await fetch(`/api/produtos/${p.codigo}/materiais`);
    if (res.ok) setItensMaterial(await res.json());
  }

  function fecharMateriais() {
    setSelecionado(null);
    setItensMaterial([]);
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

  return (
    <div>
      <div className="page-header">
        <h2>Cadastro de Produto</h2>
      </div>

      <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por descrição..." />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Foto</th>
              <th>Código</th>
              <th>Descrição</th>
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
                      style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }}
                    />
                  ) : (
                    '-'
                  )}
                </td>
                <td>{p.codigo}</td>
                <td>{p.descricao}</td>
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
                  <button className="btn-small" onClick={() => startEdit(p)}>
                    Editar
                  </button>
                  <button className="btn-small" onClick={() => abrirMateriais(p)}>
                    Materiais
                  </button>
                  <button className="btn-small danger" onClick={() => handleDelete(p.codigo)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {produtosFiltrados.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhum produto encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{editingCodigo ? 'Editar produto' : 'Novo produto'}</h3>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Descrição</label>
              <input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                required
              />
            </div>
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
              <p className="hint">Máximo 50MB.</p>
            </div>
            <div className="field">
              <label>Foto</label>
              <div className="paste-zone" tabIndex={0} onPaste={handleFotoPaste}>
                {form.fotoPreview ? (
                  <img src={form.fotoPreview} alt="Prévia" className="paste-zone-preview" />
                ) : (
                  <span className="hint" style={{ margin: 0 }}>
                    Clique aqui e pressione Ctrl+V para colar uma imagem
                  </span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFotoChange(e.target.files?.[0] || null)}
              />
              <p className="hint">Máximo 4MB. Deixe em branco para manter a foto atual.</p>
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

      {selecionado && (
        <div className="card">
          <div className="card-header">
            <h3>Materiais de {selecionado.descricao}</h3>
            <button className="btn-small" onClick={fecharMateriais}>
              Fechar
            </button>
          </div>

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
                      {item.tipo_nome} — {item.marca} ({item.cor})
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
                <select
                  value={novoMaterial.materia_prima_codigo}
                  onChange={(e) => setNovoMaterial({ ...novoMaterial, materia_prima_codigo: e.target.value })}
                  required
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {materiasPrimas.map((mp) => (
                    <option key={mp.codigo} value={mp.codigo}>
                      {mp.tipo_nome} — {mp.marca} ({mp.cor})
                    </option>
                  ))}
                </select>
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
        </div>
      )}
    </div>
  );
}
