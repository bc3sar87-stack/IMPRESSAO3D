'use client';

import { useEffect, useState } from 'react';
import SearchBox from '../search-box';
import LotesMateriaPrima, { LotesAlvo } from '../lotes-materia-prima';

interface ItemEstoque {
  codigo: number;
  tipo_nome: string;
  cor: string;
  cor_hex: string;
  saldo: string;
  unidade_medida_sigla: string;
  total_lotes: string;
  reservado: string;
}

export default function EstoquePage() {
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [selecionado, setSelecionado] = useState<LotesAlvo | null>(null);
  const [busca, setBusca] = useState('');

  const itensFiltrados = itens.filter((item) => {
    const q = busca.toLowerCase();
    return item.tipo_nome.toLowerCase().includes(q) || item.cor.toLowerCase().includes(q);
  });

  async function load() {
    const res = await fetch('/api/estoque');
    if (res.ok) setItens(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  function abrirCor(item: ItemEstoque) {
    setSelecionado({
      codigo: item.codigo,
      tipo_nome: item.tipo_nome,
      cor: item.cor,
      unidade_medida_sigla: item.unidade_medida_sigla,
    });
  }

  return (
    <div>
      <div className="page-header">
        <h2>Controle de Estoque</h2>
      </div>

      <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por tipo ou cor..." />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>Cor</th>
              <th>Saldo Físico</th>
              <th>Reservado</th>
              <th>Disponível</th>
              <th>Unidade</th>
              <th>Lotes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itensFiltrados.map((item) => {
              const disponivel = Number(item.saldo) - Number(item.reservado);
              return (
                <tr key={item.codigo}>
                  <td>{item.codigo}</td>
                  <td>{item.tipo_nome}</td>
                  <td>
                    <span className="color-swatch" style={{ backgroundColor: item.cor_hex }} />
                    {item.cor}
                  </td>
                  <td>{item.saldo}</td>
                  <td>{Number(item.reservado) > 0 ? item.reservado : '-'}</td>
                  <td style={{ color: disponivel <= 0 ? '#dc2626' : undefined, fontWeight: 600 }}>
                    {disponivel.toFixed(2)}
                  </td>
                  <td>{item.unidade_medida_sigla}</td>
                  <td>{item.total_lotes}</td>
                  <td>
                    <button className="btn-small" onClick={() => abrirCor(item)}>
                      Ver Lotes
                    </button>
                  </td>
                </tr>
              );
            })}
            {itensFiltrados.length === 0 && (
              <tr>
                <td colSpan={9}>Nenhuma matéria prima encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <LotesMateriaPrima alvo={selecionado} onClose={() => setSelecionado(null)} onChange={load} />
    </div>
  );
}
