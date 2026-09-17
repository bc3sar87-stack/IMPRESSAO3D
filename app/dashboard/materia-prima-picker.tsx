'use client';

import { useState } from 'react';
import SearchBox from './search-box';

export interface MateriaPrimaPickerItem {
  codigo: number;
  tipo_nome: string;
  marca: string;
  cor: string;
  cor_hex: string;
  unidade_medida_sigla: string;
  valor_custo: string | null;
  fornecedor?: string | null;
  estoque?: string | number | null;
}

export default function MateriaPrimaPicker({
  open,
  materiais,
  onSelect,
  onClose,
}: {
  open: boolean;
  materiais: MateriaPrimaPickerItem[];
  onSelect: (item: MateriaPrimaPickerItem) => void;
  onClose: () => void;
}) {
  const [busca, setBusca] = useState('');

  if (!open) return null;

  const q = busca.toLowerCase();
  const filtrados = materiais.filter((m) =>
    `${m.tipo_nome} ${m.marca} ${m.cor}`.toLowerCase().includes(q)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3>Selecionar Matéria Prima</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por tipo, marca ou cor..." />
        <div className="product-picker-list">
          {filtrados.map((m) => (
            <button
              type="button"
              key={m.codigo}
              className="product-picker-item"
              onClick={() => {
                onSelect(m);
                onClose();
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 6,
                  backgroundColor: m.cor_hex,
                  border: '1px solid #e2e8f0',
                  flexShrink: 0,
                }}
              />
              <div className="product-picker-info">
                <strong>
                  #{m.codigo} · {m.tipo_nome} — {m.marca}
                </strong>
                <span>Cor: {m.cor}</span>
                <span>
                  Custo:{' '}
                  {m.valor_custo
                    ? `R$ ${Number(m.valor_custo).toFixed(2)} / ${m.unidade_medida_sigla}`
                    : 'Não informado'}
                </span>
                {m.estoque !== undefined && m.estoque !== null && (
                  <span style={{ color: Number(m.estoque) <= 0 ? '#dc2626' : undefined, fontWeight: 600 }}>
                    Disponível: {Number(m.estoque).toLocaleString('pt-BR')} {m.unidade_medida_sigla}
                  </span>
                )}
                {m.fornecedor && <span>Fornecedor: {m.fornecedor}</span>}
              </div>
            </button>
          ))}
          {filtrados.length === 0 && <p className="hint">Nenhuma matéria prima encontrada.</p>}
        </div>
      </div>
    </div>
  );
}
