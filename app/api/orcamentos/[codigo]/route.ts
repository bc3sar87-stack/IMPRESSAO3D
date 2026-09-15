import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;
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
  } = await request.json().catch(() => ({}));

  if (!cliente_codigo || !data || !status) {
    return NextResponse.json({ error: 'Preencha cliente, data e status.' }, { status: 400 });
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
    `UPDATE orcamentos SET cliente_codigo=$1, data=$2, data_entrega=$3, status=$4, observacoes=$5,
            equipamento_codigo=$6, markup_percentual=$7, impostos_percentual=$8, taxa_marketplace=$9,
            taxa_percentual=$10, embalagem_valor=$11, custos_extras_valor=$12
     WHERE codigo=$13 AND empresa_codigo=$14
     RETURNING codigo`,
    [
      cliente_codigo,
      data,
      data_entrega || null,
      status,
      observacoes || null,
      equipamento_codigo || null,
      markup_percentual || 0,
      impostos_percentual || 0,
      taxa_marketplace || 'MANUAL',
      taxa_percentual || 0,
      embalagem_valor || 0,
      custos_extras_valor || 0,
      codigo,
      session.empresa_codigo,
    ]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 });
  }
  return NextResponse.json({ codigo: rows[0].codigo });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;
  await pool.query(`DELETE FROM orcamentos WHERE codigo=$1 AND empresa_codigo=$2`, [
    codigo,
    session.empresa_codigo,
  ]);
  return NextResponse.json({ ok: true });
}
