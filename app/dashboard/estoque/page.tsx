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
  estoque_minimo: string | null;
}

export default function EstoquePage() {
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [selecionado, setSelecionado] = useState<LotesAlvo | null>(null);
  const [busca, setBusca] = useState('');
  const [apenasEstoqueBaixo, setApenasEstoqueBaixo] = useState(false);

  const itensFiltrados = itens.filter((item) => {
    const q = busca.toLowerCase();
    const combina = item.tipo_nome.toLowerCase().includes(q) || item.cor.toLowerCase().includes(q);
    if (!combina) return false;
    if (apenasEstoqueBaixo) {
      const disponivel = Number(item.saldo) - Number(item.reservado);
      const minimo = item.estoque_minimo !== null ? Number(item.estoque_minimo) : null;
      return minimo !== null && disponivel <= minimo;
    }
    return true;
  });

  const totalEstoqueBaixo = itens.filter((item) => {
    const disponivel = Number(item.saldo) - Number(item.reservado);
    const minimo = item.estoque_minimo !== null ? Number(item.estoque_minimo) : null;
    return minimo !== null && disponivel <= minimo;
  }).length;

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

      {totalEstoqueBaixo > 0 && (
        <div className="error-msg" style={{ marginBottom: 16 }}>
          {totalEstoqueBaixo} {totalEstoqueBaixo === 1 ? 'item está' : 'itens estão'} com estoque baixo.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por tipo ou cor..." />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 0', whiteSpace: 'nowrap' }}>
          <input
            type="checkbox"
            checked={apenasEstoqueBaixo}
            onChange={(e) => setApenasEstoqueBaixo(e.target.checked)}
          />
          Mostrar apenas estoque baixo
        </label>
      </div>

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
              <th>Estoque Mínimo</th>
              <th>Situação</th>
              <th>Unidade</th>
              <th>Lotes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itensFiltrados.map((item) => {
              const disponivel = Number(item.saldo) - Number(item.reservado);
              const minimo = item.estoque_minimo !== null ? Number(item.estoque_minimo) : null;
              const estoqueBaixo = minimo !== null && disponivel <= minimo;
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
                  <td>{minimo !== null ? minimo.toFixed(2) : '-'}</td>
                  <td>
                    {minimo === null ? (
                      '-'
                    ) : (
                      <span className={`status-badge ${estoqueBaixo ? 'status-badge-red' : 'status-badge-green'}`}>
                        {estoqueBaixo ? 'Estoque Baixo' : 'OK'}
                      </span>
                    )}
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
                <td colSpan={11}>Nenhuma matéria prima encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <LotesMateriaPrima alvo={selecionado} onClose={() => setSelecionado(null)} onChange={load} />
    </div>
  );
}
