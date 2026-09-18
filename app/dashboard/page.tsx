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

  if (empresaCodigo) {
    const [estoqueRes, orcamentosRes, receberRes, pagarRes, faturamentoRes] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(saldo * custo), 0) AS valor
         FROM (
           SELECT l.codigo, COALESCE(l.valor_custo, mp.valor_custo, 0) AS custo,
                  COALESCE(SUM(CASE WHEN me.tipo = 'ENTRADA' THEN me.quantidade ELSE -me.quantidade END), 0) AS saldo
           FROM materia_prima_lotes l
           JOIN materia_prima mp ON mp.codigo = l.materia_prima_codigo
           LEFT JOIN movimentacoes_estoque me ON me.lote_codigo = l.codigo
           WHERE l.empresa_codigo = $1
           GROUP BY l.codigo, l.valor_custo, mp.valor_custo
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
         WHERE empresa_codigo = $1 AND status <> 'REJEITADO' AND data >= CURRENT_DATE - INTERVAL '12 months'
         GROUP BY DATE_TRUNC('month', data)`,
        [empresaCodigo]
      ),
    ]);

    valorEstoque = Number(estoqueRes.rows[0]?.valor || 0);
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
  }

  const totalOrcamentosQuantidade = orcamentosPorStatus.reduce((s, o) => s + o.quantidade, 0);
  const totalOrcamentosValor = orcamentosPorStatus.reduce((s, o) => s + o.valor, 0);
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
                    return (
                      <tr key={st}>
                        <td>
                          <span className={`status-badge ${STATUS_BADGE_CLASS[st]}`}>{STATUS_LABELS[st]}</span>
                        </td>
                        <td>{encontrado?.quantidade || 0}</td>
                        <td>R$ {formatMoeda(encontrado?.valor || 0)}</td>
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
              Soma do valor dos orçamentos (exceto reprovados) por mês.
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
        </>
      )}
    </div>
  );
}
