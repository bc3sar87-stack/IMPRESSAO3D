import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';

export async function GET() {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json([]);
  }

  const { rows } = await pool.query(
    `SELECT o.codigo, o.data, o.data_entrega, o.status, o.observacoes, o.valor_total, o.valor_sugerido, o.custo_total,
            o.cliente_codigo, c.nome AS cliente_nome,
            o.equipamento_codigo, eq.fabricante AS equipamento_fabricante, eq.modelo AS equipamento_modelo,
            o.markup_percentual, o.impostos_percentual, o.taxa_marketplace, o.taxa_percentual,
            o.embalagem_valor, o.custos_extras_valor
     FROM orcamentos o
     JOIN clientes c ON c.codigo = o.cliente_codigo
     LEFT JOIN equipamentos eq ON eq.codigo = o.equipamento_codigo
     WHERE o.empresa_codigo = $1
     ORDER BY o.codigo DESC`,
    [session.empresa_codigo]
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa para criar orçamentos.' }, { status: 400 });
  }

  const {
    cliente_codigo,
    data,
    data_entrega,
    status,
    observacoes,
    equipamento_codigo,
    markup_percentual,
    impostos_percentual,
    taxa_marketplace,
    taxa_percentual,
    embalagem_valor,
    custos_extras_valor,
    valor_sugerido,
    custo_total,
  } = await request.json().catch(() => ({}));

  if (!cliente_codigo) {
    return NextResponse.json({ error: 'Selecione o cliente.' }, { status: 400 });
  }

  const { rows: clienteRows } = await pool.query(
    `SELECT 1 FROM clientes WHERE codigo=$1 AND empresa_codigo=$2`,
    [cliente_codigo, session.empresa_codigo]
  );
  if (clienteRows.length === 0) {
    return NextResponse.json({ error: 'Cliente inválido.' }, { status: 400 });
  }

  if (equipamento_codigo) {
    const { rows: eqRows } = await pool.query(
      `SELECT 1 FROM equipamentos WHERE codigo=$1 AND empresa_codigo=$2`,
      [equipamento_codigo, session.empresa_codigo]
    );
    if (eqRows.length === 0) {
      return NextResponse.json({ error: 'Equipamento inválido.' }, { status: 400 });
    }
  }

  const { rows } = await pool.query(
    `INSERT INTO orcamentos (
       cliente_codigo, data, data_entrega, status, observacoes, equipamento_codigo,
       markup_percentual, impostos_percentual, taxa_marketplace, taxa_percentual,
       embalagem_valor, custos_extras_valor, valor_sugerido, custo_total, empresa_codigo
     )
     VALUES ($1, COALESCE($2, CURRENT_DATE), $3, COALESCE($4, 'ABERTO'), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING codigo`,
    [
      cliente_codigo,
      data || null,
      data_entrega || null,
      status || null,
      observacoes || null,
      equipamento_codigo || null,
      markup_percentual || 0,
      impostos_percentual || 0,
      taxa_marketplace || 'MANUAL',
      taxa_percentual || 0,
      embalagem_valor || 0,
      custos_extras_valor || 0,
      valor_sugerido || null,
      custo_total || null,
      session.empresa_codigo,
    ]
  );
  return NextResponse.json({ codigo: rows[0].codigo }, { status: 201 });
}
