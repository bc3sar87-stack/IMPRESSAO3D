'use client';

import { useEffect, useState } from 'react';
import SearchBox from '../search-box';

interface Reserva {
  orcamento_codigo: number;
  orcamento_status: string;
  data: string;
  cliente_nome: string;
  materia_prima_codigo: number;
  tipo_nome: string;
  cor: string;
  cor_hex: string;
  lote_codigo: number | null;
  lote_marca: string | null;
  lote_fornecedor: string | null;
  unidade_medida_sigla: string;
  peso_reservado: string;
}

interface Baixa {
  codigo: number;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidade: string;
  criado_em: string;
  orcamento_codigo: number;
  orcamento_status: string | null;
  cliente_nome: string | null;
  materia_prima_codigo: number;
  tipo_nome: string;
  cor: string;
  cor_hex: string;
  lote_codigo: number | null;
  lote_marca: string | null;
  lote_fornecedor: string | null;
  unidade_medida_sigla: string;
}

const STATUS_LABELS: Record<string, string> = {
  ABERTO: 'Pendente',
  APROVADO: 'Aprovado',
  EM_PRODUCAO: 'Em Produção',
  FINALIZADO: 'Finalizado',
  PENDENTE_ENTREGA: 'Pendente de Entrega',
  ENTREGUE: 'Entregue',
  REJEITADO: 'Reprovado',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  ABERTO: 'status-badge-blue',
  APROVADO: 'status-badge-green',
  EM_PRODUCAO: 'status-badge-orange',
  FINALIZADO: 'status-badge-gray',
  PENDENTE_ENTREGA: 'status-badge-purple',
  ENTREGUE: 'status-badge-green',
  REJEITADO: 'status-badge-red',
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span>-</span>;
  return (
    <span className={`status-badge ${STATUS_BADGE_CLASS[status] || ''}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function RelatorioEstoquePage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [baixas, setBaixas] = useState<Baixa[]>([]);
  const [buscaReservas, setBuscaReservas] = useState('');
  const [buscaBaixas, setBuscaBaixas] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function load() {
      const [resReservas, resBaixas] = await Promise.all([
        fetch('/api/estoque/reservas'),
        fetch('/api/estoque/baixas'),
      ]);
      if (resReservas.ok) setReservas(await resReservas.json());
      if (resBaixas.ok) setBaixas(await resBaixas.json());
      setCarregando(false);
    }
    load();
  }, []);

  const reservasFiltradas = reservas.filter((r) => {
    const q = buscaReservas.toLowerCase();
    return (
      String(r.orcamento_codigo).includes(q) ||
      r.cliente_nome.toLowerCase().includes(q) ||
      r.tipo_nome.toLowerCase().includes(q) ||
      r.cor.toLowerCase().includes(q)
    );
  });

  const baixasFiltradas = baixas.filter((b) => {
    const q = buscaBaixas.toLowerCase();
    return (
      String(b.orcamento_codigo).includes(q) ||
      (b.cliente_nome || '').toLowerCase().includes(q) ||
      b.tipo_nome.toLowerCase().includes(q) ||
      b.cor.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="page-header">
        <h2>Relatório de Reservas e Baixas de Estoque</h2>
      </div>

      {carregando ? (
        <p className="hint">Carregando...</p>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Reservado (pedidos em aberto)</h3>
            <p className="hint" style={{ marginTop: -8 }}>
              Materiais amarrados a orçamentos ainda não finalizados (a baixa definitiva ainda não ocorreu).
            </p>
            <SearchBox
              value={buscaReservas}
              onChange={setBuscaReservas}
              placeholder="Pesquisar por pedido, cliente, tipo ou cor..."
            />
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Status</th>
                    <th>Matéria Prima</th>
                    <th>Lote</th>
                    <th>Peso Reservado</th>
                  </tr>
                </thead>
                <tbody>
                  {reservasFiltradas.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <a href={`/dashboard/orcamento-pdf/${r.orcamento_codigo}`} target="_blank" rel="noreferrer">
                          #{r.orcamento_codigo}
                        </a>
                      </td>
                      <td>{r.cliente_nome}</td>
                      <td>
                        <StatusBadge status={r.orcamento_status} />
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 3,
                              backgroundColor: r.cor_hex,
                              border: '1px solid #cbd5e1',
                              display: 'inline-block',
                            }}
                          />
                          {r.tipo_nome} — {r.cor}
                        </span>
                      </td>
                      <td>
                        {r.lote_codigo
                          ? `#${r.lote_codigo} · ${r.lote_marca || r.lote_fornecedor || 'sem marca'}`
                          : 'Sem lote'}
                      </td>
                      <td>
                        {Number(r.peso_reservado).toFixed(2)} {r.unidade_medida_sigla}
                      </td>
                    </tr>
                  ))}
                  {reservasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={6}>Nenhuma reserva em aberto.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Baixas por Pedido (kardex)</h3>
            <p className="hint" style={{ marginTop: -8 }}>
              Histórico de saídas definitivas e estornos gerados a partir de orçamentos.
            </p>
            <SearchBox
              value={buscaBaixas}
              onChange={setBuscaBaixas}
              placeholder="Pesquisar por pedido, cliente, tipo ou cor..."
            />
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Status Atual</th>
                    <th>Tipo</th>
                    <th>Matéria Prima</th>
                    <th>Lote</th>
                    <th>Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  {baixasFiltradas.map((b) => (
                    <tr key={b.codigo}>
                      <td>{new Date(b.criado_em).toLocaleString('pt-BR')}</td>
                      <td>
                        <a href={`/dashboard/orcamento-pdf/${b.orcamento_codigo}`} target="_blank" rel="noreferrer">
                          #{b.orcamento_codigo}
                        </a>
                      </td>
                      <td>{b.cliente_nome || '-'}</td>
                      <td>
                        <StatusBadge status={b.orcamento_status} />
                      </td>
                      <td>
                        <span className={`status-badge ${b.tipo === 'SAIDA' ? 'status-badge-red' : 'status-badge-green'}`}>
                          {b.tipo === 'SAIDA' ? 'Baixa (Saída)' : 'Estorno (Entrada)'}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 3,
                              backgroundColor: b.cor_hex,
                              border: '1px solid #cbd5e1',
                              display: 'inline-block',
                            }}
                          />
                          {b.tipo_nome} — {b.cor}
                        </span>
                      </td>
                      <td>
                        {b.lote_codigo
                          ? `#${b.lote_codigo} · ${b.lote_marca || b.lote_fornecedor || 'sem marca'}`
                          : 'Sem lote'}
                      </td>
                      <td>
                        {Number(b.quantidade).toFixed(2)} {b.unidade_medida_sigla}
                      </td>
                    </tr>
                  ))}
                  {baixasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={8}>Nenhuma baixa registrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
