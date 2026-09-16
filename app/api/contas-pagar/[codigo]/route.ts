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
  const { fornecedor, descricao, valor, data_vencimento, data_pagamento, status, banco_codigo } =
    await request.json().catch(() => ({}));

  if (!descricao || valor === undefined || valor === '' || !data_vencimento || !status) {
    return NextResponse.json(
      { error: 'Informe descrição, valor, vencimento e status.' },
      { status: 400 }
    );
  }
  if (Number(valor) <= 0) {
    return NextResponse.json({ error: 'Valor deve ser maior que zero.' }, { status: 400 });
  }
  if (status === 'PAGO' && !banco_codigo) {
    return NextResponse.json(
      { error: 'Selecione o banco em que o título será baixado.' },
      { status: 400 }
    );
  }

  if (banco_codigo) {
    const { rows: bancoRows } = await pool.query(
      `SELECT 1 FROM bancos WHERE codigo=$1 AND empresa_codigo=$2`,
      [banco_codigo, session.empresa_codigo]
    );
    if (bancoRows.length === 0) {
      return NextResponse.json({ error: 'Banco inválido.' }, { status: 400 });
    }
  }

  const { rows } = await pool.query(
    `UPDATE contas_pagar
     SET fornecedor=$1, descricao=$2, valor=$3, data_vencimento=$4, data_pagamento=$5, status=$6, banco_codigo=$7
     WHERE codigo=$8 AND empresa_codigo=$9
     RETURNING codigo`,
    [
      fornecedor || null,
      descricao,
      valor,
      data_vencimento,
      data_pagamento || null,
      status,
      banco_codigo || null,
      codigo,
      session.empresa_codigo,
    ]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 });
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
  await pool.query(`DELETE FROM contas_pagar WHERE codigo=$1 AND empresa_codigo=$2`, [
    codigo,
    session.empresa_codigo,
  ]);
  return NextResponse.json({ ok: true });
}
