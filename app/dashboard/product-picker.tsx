'use client';

import { useState } from 'react';
import SearchBox from './search-box';
import { formatSegundos } from './time-input';

export interface ProdutoPicker {
  codigo: number;
  descricao: string;
  quantidade: number;
  tempo_impressao_segundos: number;
  tempo_mao_obra_segundos: number;
  tem_foto: boolean;
}

export default function ProductPicker({
  open,
  produtos,
  onSelect,
  onClose,
}: {
  open: boolean;
  produtos: ProdutoPicker[];
  onSelect: (produto: ProdutoPicker) => void;
  onClose: () => void;
}) {
  const [busca, setBusca] = useState('');

  if (!open) return null;

  const filtrados = produtos.filter((p) => p.descricao.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h3>Selecionar Produto</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por descrição..." />
        <div className="product-picker-list">
          {filtrados.map((p) => (
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
                <span>Qtd por lote: {p.quantidade}</span>
                <span>Impressão: {formatSegundos(p.tempo_impressao_segundos)}</span>
                <span>Mão de obra: {formatSegundos(p.tempo_mao_obra_segundos)}</span>
              </div>
            </button>
          ))}
          {filtrados.length === 0 && <p className="hint">Nenhum produto encontrado.</p>}
        </div>
      </div>
    </div>
  );
}
