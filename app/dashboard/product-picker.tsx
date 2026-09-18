'use client';

import { useState } from 'react';
import SearchBox from './search-box';
import { formatSegundos } from './time-input';

export interface ProdutoPickerMaterial {
  materia_prima_codigo: number;
  nome: string;
  cor: string;
  cor_hex: string;
  peso: string;
  unidade_medida_sigla: string;
  valor_custo: string | null;
}

export interface ProdutoPickerCustoFixo {
  codigo: number;
  descricao: string;
  custo: string;
}

export interface ProdutoPicker {
  codigo: number;
  descricao: string;
  quantidade: number;
  tempo_impressao_segundos: number;
  tempo_mao_obra_segundos: number;
  tem_foto: boolean;
  materiais: ProdutoPickerMaterial[];
  custos_fixos: ProdutoPickerCustoFixo[];
  tipo: 'IMPRESSAO' | 'REVENDA';
  valor_custo: string | null;
  grupo_codigo: number | null;
  grupo_nome: string | null;
}

export default function ProductPicker({
  open,
  produtos,
  grupos,
  custoBaseFilamento,
  onSelect,
  onClose,
}: {
  open: boolean;
  produtos: ProdutoPicker[];
  grupos?: { codigo: number; nome: string }[];
  custoBaseFilamento: string;
  onSelect: (produto: ProdutoPicker) => void;
  onClose: () => void;
}) {
  const [busca, setBusca] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('');

  if (!open) return null;

  const custoPadrao = Number(custoBaseFilamento) || 0;
  const filtrados = produtos.filter(
    (p) =>
      p.descricao.toLowerCase().includes(busca.toLowerCase()) &&
      (!filtroGrupo || String(p.grupo_codigo) === filtroGrupo)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h3>Selecionar Produto</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        {grupos && grupos.length > 0 && (
          <select
            value={filtroGrupo}
            onChange={(e) => setFiltroGrupo(e.target.value)}
            style={{ marginBottom: 8, width: '100%' }}
          >
            <option value="">Todos os grupos</option>
            {grupos.map((g) => (
              <option key={g.codigo} value={g.codigo}>
                {g.nome}
              </option>
            ))}
          </select>
        )}
        <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por descrição..." />
        <div className="product-picker-list">
          {filtrados.map((p) => {
            const custoMaterial = p.materiais.reduce((soma, m) => {
              const custoKg = m.valor_custo ? Number(m.valor_custo) : custoPadrao;
              return soma + (Number(m.peso) / 1000) * custoKg;
            }, 0);

            return (
              <button
                type="button"
                key={p.codigo}
                className="product-picker-item"
                onClick={() => {
                  onSelect(p);
                  onClose();
                }}
              >
                {p.tem_foto ? (
                  <img src={`/api/produtos/${p.codigo}/foto`} alt={p.descricao} className="product-picker-thumb" />
                ) : (
                  <div className="product-picker-noimg">Sem foto</div>
                )}
                <div className="product-picker-info">
                  <strong>{p.descricao}</strong>
                  {p.tipo === 'REVENDA' ? (
                    <>
                      <span>
                        <span className="status-badge status-badge-purple">Revenda</span>
                      </span>
                      <span>Qtd por lote: {p.quantidade}</span>
                      <span>Custo: R$ {Number(p.valor_custo || 0).toFixed(2)}</span>
                    </>
                  ) : (
                    <>
                      <span>Qtd por lote: {p.quantidade}</span>
                      <span>Impressão: {formatSegundos(p.tempo_impressao_segundos)}</span>
                      <span>Mão de obra: {formatSegundos(p.tempo_mao_obra_segundos)}</span>
                      {p.materiais.length > 0 ? (
                        <>
                          <span className="product-picker-materiais">
                            {p.materiais.map((m) => (
                              <span key={m.materia_prima_codigo} className="product-picker-material-tag">
                                <span className="color-swatch" style={{ backgroundColor: m.cor_hex }} />
                                {m.nome} ({m.cor}) — {Number(m.peso).toFixed(1)} {m.unidade_medida_sigla}
                              </span>
                            ))}
                          </span>
                          <span>Custo material: R$ {custoMaterial.toFixed(2)}</span>
                        </>
                      ) : (
                        <span>Sem material cadastrado</span>
                      )}
                    </>
                  )}
                </div>
              </button>
            );
          })}
          {filtrados.length === 0 && <p className="hint">Nenhum produto encontrado.</p>}
        </div>
      </div>
    </div>
  );
}
