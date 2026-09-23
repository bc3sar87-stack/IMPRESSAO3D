import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { pool } from '@/lib/db';

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

const STATUS_ORDER = [
  'ABERTO',
  'APROVADO',
  'EM_PRODUCAO',
  'FINALIZADO',
  'PENDENTE_ENTREGA',
  'ENTREGUE',
  'REJEITADO',
];

const STATUS_ROTA: Record<string, string> = {
  ABERTO: '/dashboard/orcamentos',
  APROVADO: '/dashboard/orcamentos-aprovados',
  EM_PRODUCAO: '/dashboard/orcamentos-em-producao',
  FINALIZADO: '/dashboard/orcamentos-finalizados',
  PENDENTE_ENTREGA: '/dashboard/orcamentos-pendente-entrega',
  ENTREGUE: '/dashboard/orcamentos-entregues',
  REJEITADO: '/dashboard/orcamentos-reprovados',
};

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function DashboardPage() {
  const session = await getSession();

  const { rows: empresas } = session
    ? await pool.query(
        `SELECT e.codigo, e.razao_social
         FROM empresa e
         JOIN usuarios_empresas ue ON ue.empresa_codigo = e.codigo
         WHERE ue.usuario_codigo = $1
         ORDER BY e.razao_social`,
        [session.codigo]
      )
    : { rows: [] };

  const empresaCodigo = session?.empresa_codigo;

  let valorEstoque = 0;
  let orcamentosPorStatus: { status: string; quantidade: number; valor: number }[] = [];
  let contasReceber = { quantidade: 0, valor: 0, vencidasQuantidade: 0, vencidasValor: 0 };
  let contasPagar = { quantidade: 0, valor: 0, vencidasQuantidade: 0, vencidasValor: 0 };
  let faturamentoMensal: { mes: string; valor: number }[] = [];
  let horasImpressaoMensal: { mes: string; horas: number }[] = [];
  let previstoTotal12m = 0;
  let estoqueBaixo: { codigo: number; tipo_nome: string; cor: string; cor_hex: string; unidade_medida_sigla: string; disponivel: number; minimo: number }[] = [];

  if (empresaCodigo) {
    const [estoqueRes, orcamentosRes, receberRes, pagarRes, faturamentoRes, horasImpressaoRes, previstoRes, estoqueMinimoRes] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(saldo * custo_unitario), 0) AS valor
         FROM (
           SELECT l.codigo,
                  CASE
                    WHEN l.valor_custo IS NOT NULL AND l.quantidade_inicial > 0
                      THEN l.valor_custo / l.quantidade_inicial
                    ELSE 0
                  END AS custo_unitario,
                  COALESCE(SUM(CASE WHEN me.tipo = 'ENTRADA' THEN me.quantidade ELSE -me.quantidade END), 0) AS saldo
           FROM materia_prima_lotes l
           LEFT JOIN movimentacoes_estoque me ON me.lote_codigo = l.codigo
           WHERE l.empresa_codigo = $1
           GROUP BY l.codigo, l.valor_custo, l.quantidade_inicial
         ) x`,
        [empresaCodigo]
      ),
      pool.query(
        `SELECT status, COUNT(*) AS quantidade, COALESCE(SUM(valor_total), 0) AS valor
         FROM orcamentos
         WHERE empresa_codigo = $1
         GROUP BY status`,
        [empresaCodigo]
      ),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'ABERTO') AS quantidade,
           COALESCE(SUM(valor) FILTER (WHERE status = 'ABERTO'), 0) AS valor,
           COUNT(*) FILTER (WHERE status = 'ABERTO' AND data_vencimento < CURRENT_DATE) AS vencidas_quantidade,
           COALESCE(SUM(valor) FILTER (WHERE status = 'ABERTO' AND data_vencimento < CURRENT_DATE), 0) AS vencidas_valor
         FROM contas_receber WHERE empresa_codigo = $1`,
        [empresaCodigo]
      ),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'ABERTO') AS quantidade,
           COALESCE(SUM(valor) FILTER (WHERE status = 'ABERTO'), 0) AS valor,
           COUNT(*) FILTER (WHERE status = 'ABERTO' AND data_vencimento < CURRENT_DATE) AS vencidas_quantidade,
           COALESCE(SUM(valor) FILTER (WHERE status = 'ABERTO' AND data_vencimento < CURRENT_DATE), 0) AS vencidas_valor
         FROM contas_pagar WHERE empresa_codigo = $1`,
        [empresaCodigo]
      ),
      pool.query(
        `SELECT TO_CHAR(DATE_TRUNC('month', data), 'YYYY-MM') AS mes, COALESCE(SUM(valor_total), 0) AS valor
         FROM orcamentos
         WHERE empresa_codigo = $1 AND status = 'ENTREGUE' AND data >= CURRENT_DATE - INTERVAL '12 months'
         GROUP BY DATE_TRUNC('month', data)`,
        [empresaCodigo]
      ),
      pool.query(
        `SELECT TO_CHAR(DATE_TRUNC('month', o.data), 'YYYY-MM') AS mes,
                COALESCE(SUM(p.tempo_impressao_segundos * oi.quantidade), 0) AS segundos
         FROM orcamento_itens oi
         JOIN orcamentos o ON o.codigo = oi.orcamento_codigo
         JOIN produtos p ON p.codigo = oi.produto_codigo
         WHERE o.empresa_codigo = $1 AND o.status IN ('FINALIZADO', 'PENDENTE_ENTREGA', 'ENTREGUE')
           AND o.data >= CURRENT_DATE - INTERVAL '12 months'
         GROUP BY DATE_TRUNC('month', o.data)`,
        [empresaCodigo]
      ),
      pool.query(
        `SELECT COALESCE(SUM(valor_total), 0) AS valor
         FROM orcamentos
         WHERE empresa_codigo = $1 AND status NOT IN ('ABERTO', 'REJEITADO')
           AND data >= CURRENT_DATE - INTERVAL '12 months'`,
        [empresaCodigo]
      ),
      pool.query(
        `SELECT mp.codigo, t.nome AS tipo_nome, mp.cor, mp.cor_hex, mp.estoque_minimo,
                u.sigla AS unidade_medida_sigla,
                COALESCE(SUM(CASE WHEN me.tipo = 'ENTRADA' THEN me.quantidade ELSE -me.quantidade END), 0) AS saldo,
                COALESCE((
                  SELECT SUM(oim.peso * oi.quantidade)
                  FROM orcamento_item_materiais oim
                  JOIN orcamento_itens oi ON oi.codigo = oim.orcamento_item_codigo
                  JOIN orcamentos o ON o.codigo = oi.orcamento_codigo
                  WHERE oim.materia_prima_codigo = mp.codigo AND oim.baixado_em IS NULL AND o.status <> 'REJEITADO'
                        AND o.consome_estoque = true
                ), 0) AS reservado
         FROM materia_prima mp
         JOIN tipos_materia_prima t ON t.codigo = mp.tipo_codigo
         JOIN unidades_medida u ON u.codigo = mp.unidade_medida_codigo
         LEFT JOIN materia_prima_lotes l ON l.materia_prima_codigo = mp.codigo
         LEFT JOIN movimentacoes_estoque me ON me.lote_codigo = l.codigo
         WHERE mp.empresa_codigo = $1 AND mp.estoque_minimo IS NOT NULL
         GROUP BY mp.codigo, t.nome, mp.cor, mp.cor_hex, mp.estoque_minimo, u.sigla`,
        [empresaCodigo]
      ),
    ]);

    valorEstoque = Number(estoqueRes.rows[0]?.valor || 0);
    previstoTotal12m = Number(previstoRes.rows[0]?.valor || 0);
    estoqueBaixo = estoqueMinimoRes.rows
      .map((r) => ({
        codigo: r.codigo,
        tipo_nome: r.tipo_nome,
        cor: r.cor,
        cor_hex: r.cor_hex,
        unidade_medida_sigla: r.unidade_medida_sigla,
        disponivel: Number(r.saldo) - Number(r.reservado),
        minimo: Number(r.estoque_minimo),
      }))
      .filter((r) => r.disponivel <= r.minimo);
    orcamentosPorStatus = orcamentosRes.rows.map((r) => ({
      status: r.status,
      quantidade: Number(r.quantidade),
      valor: Number(r.valor),
    }));
    contasReceber = {
      quantidade: Number(receberRes.rows[0]?.quantidade || 0),
      valor: Number(receberRes.rows[0]?.valor || 0),
      vencidasQuantidade: Number(receberRes.rows[0]?.vencidas_quantidade || 0),
      vencidasValor: Number(receberRes.rows[0]?.vencidas_valor || 0),
    };
    contasPagar = {
      quantidade: Number(pagarRes.rows[0]?.quantidade || 0),
      valor: Number(pagarRes.rows[0]?.valor || 0),
      vencidasQuantidade: Number(pagarRes.rows[0]?.vencidas_quantidade || 0),
      vencidasValor: Number(pagarRes.rows[0]?.vencidas_valor || 0),
    };

    const seriesMap = new Map<string, number>(faturamentoRes.rows.map((r) => [r.mes, Number(r.valor)]));
    const hoje = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      faturamentoMensal.push({
        mes: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        valor: seriesMap.get(chave) || 0,
      });
    }

    const horasSeriesMap = new Map<string, number>(
      horasImpressaoRes.rows.map((r) => [r.mes, Number(r.segundos) / 3600])
    );
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      horasImpressaoMensal.push({
        mes: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        horas: horasSeriesMap.get(chave) || 0,
      });
    }
  }

  const totalOrcamentosQuantidade = orcamentosPorStatus.reduce((s, o) => s + o.quantidade, 0);
  const totalOrcamentosValor = orcamentosPorStatus.reduce((s, o) => s + o.valor, 0);
  const totalHorasImpressao12m = horasImpressaoMensal.reduce((s, m) => s + m.horas, 0);
  const maxHorasImpressao = Math.max(1, ...horasImpressaoMensal.map((m) => m.horas));
  const faturamentoTotal12m = faturamentoMensal.reduce((s, m) => s + m.valor, 0);
  const maxFaturamento = Math.max(1, ...faturamentoMensal.map((m) => m.valor));

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <p>
          Bem-vindo, <strong>{session?.nome}</strong>
        </p>
        <p>
          Nível: <strong>{session?.nivel}</strong>
        </p>
      </div>

      {!empresaCodigo ? (
        <div className="card">
          <p style={{ marginTop: 0 }}>
            <strong>Empresas vinculadas</strong>
          </p>
          {empresas.length === 0 ? (
            <p style={{ color: '#64748b' }}>Nenhuma empresa vinculada ao seu usuário ainda.</p>
          ) : (
            <ul>
              {empresas.map((e) => (
                <li key={e.codigo}>{e.razao_social}</li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          {estoqueBaixo.length > 0 && (
            <div className="card" style={{ marginBottom: 16, borderColor: '#fecaca', background: '#fef2f2' }}>
              <h3 style={{ marginTop: 0, color: '#991b1b' }}>
                ⚠ {estoqueBaixo.length} {estoqueBaixo.length === 1 ? 'item com estoque baixo' : 'itens com estoque baixo'}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {estoqueBaixo.map((item) => (
                  <Link
                    key={item.codigo}
                    href="/dashboard/estoque"
                    className="status-badge status-badge-red"
                    style={{ textDecoration: 'none' }}
                    title={`Disponível: ${item.disponivel.toFixed(2)} ${item.unidade_medida_sigla} (mínimo: ${item.minimo.toFixed(2)})`}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: 3,
                        backgroundColor: item.cor_hex,
                        marginRight: 6,
                      }}
                    />
                    {item.tipo_nome} — {item.cor}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="fin-summary" style={{ marginBottom: 16 }}>
            <div className="fin-summary-item">
              <span>Valor em Estoque</span>
              <strong>R$ {formatMoeda(valorEstoque)}</strong>
            </div>
            <div className="fin-summary-item">
              <span>Contas a Receber (em aberto)</span>
              <strong style={{ color: '#16a34a' }}>R$ {formatMoeda(contasReceber.valor)}</strong>
              {contasReceber.vencidasValor > 0 && (
                <p className="hint" style={{ color: '#dc2626', margin: '4px 0 0' }}>
                  Vencidas: R$ {formatMoeda(contasReceber.vencidasValor)} ({contasReceber.vencidasQuantidade})
                </p>
              )}
            </div>
            <div className="fin-summary-item">
              <span>Contas a Pagar (em aberto)</span>
              <strong style={{ color: '#dc2626' }}>R$ {formatMoeda(contasPagar.valor)}</strong>
              {contasPagar.vencidasValor > 0 && (
                <p className="hint" style={{ color: '#dc2626', margin: '4px 0 0' }}>
                  Vencidas: R$ {formatMoeda(contasPagar.vencidasValor)} ({contasPagar.vencidasQuantidade})
                </p>
              )}
            </div>
            <div className="fin-summary-item">
              <span>Faturamento (12 meses)</span>
              <strong>R$ {formatMoeda(faturamentoTotal12m)}</strong>
            </div>
            <div className="fin-summary-item">
              <span>Previsto (12 meses)</span>
              <strong>R$ {formatMoeda(previstoTotal12m)}</strong>
            </div>
            <div className="fin-summary-item">
              <span>Horas de Impressão Realizadas (12 meses)</span>
              <strong>{formatMoeda(totalHorasImpressao12m)} h</strong>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Orçamentos por Status</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Quantidade</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {STATUS_ORDER.map((st) => {
                    const encontrado = orcamentosPorStatus.find((o) => o.status === st);
                    const linkStyle = {
                      display: 'block',
                      padding: '13px 16px',
                      color: 'inherit',
                      textDecoration: 'none',
                    };
                    return (
                      <tr key={st}>
                        <td style={{ padding: 0 }}>
                          <Link href={STATUS_ROTA[st]} style={linkStyle}>
                            <span className={`status-badge ${STATUS_BADGE_CLASS[st]}`}>{STATUS_LABELS[st]}</span>
                          </Link>
                        </td>
                        <td style={{ padding: 0 }}>
                          <Link href={STATUS_ROTA[st]} style={linkStyle}>
                            {encontrado?.quantidade || 0}
                          </Link>
                        </td>
                        <td style={{ padding: 0 }}>
                          <Link href={STATUS_ROTA[st]} style={linkStyle}>
                            R$ {formatMoeda(encontrado?.valor || 0)}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td style={{ fontWeight: 600 }}>Total</td>
                    <td style={{ fontWeight: 600 }}>{totalOrcamentosQuantidade}</td>
                    <td style={{ fontWeight: 600 }}>R$ {formatMoeda(totalOrcamentosValor)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Faturamento nos últimos 12 meses</h3>
            <p className="hint" style={{ marginTop: -8 }}>
              Soma do valor dos orçamentos entregues por mês.
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 190, padding: '8px 4px', overflowX: 'auto' }}>
              {faturamentoMensal.map((m, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 44 }}
                >
                  <div
                    title={`R$ ${formatMoeda(m.valor)}`}
                    style={{
                      width: 26,
                      height: Math.max(3, (m.valor / maxFaturamento) * 140),
                      background: '#2563eb',
                      borderRadius: 4,
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{m.mes}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Horas de Impressão Realizadas nos últimos 12 meses</h3>
            <p className="hint" style={{ marginTop: -8 }}>
              Soma do tempo de impressão dos itens de orçamentos finalizados, pendentes de entrega ou entregues, por mês.
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 190, padding: '8px 4px', overflowX: 'auto' }}>
              {horasImpressaoMensal.map((m, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 44 }}
                >
                  <div
                    title={`${formatMoeda(m.horas)} h`}
                    style={{
                      width: 26,
                      height: Math.max(3, (m.horas / maxHorasImpressao) * 140),
                      background: '#f59e0b',
                      borderRadius: 4,
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{m.mes}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
