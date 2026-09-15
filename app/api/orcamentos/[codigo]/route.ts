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
  const { cliente_codigo, data, status, observacoes } = await request.json().catch(() => ({}));

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

  const { rows } = await pool.query(
    `UPDATE orcamentos SET cliente_codigo=$1, data=$2, status=$3, observacoes=$4
     WHERE codigo=$5 AND empresa_codigo=$6
     RETURNING codigo`,
    [cliente_codigo, data, status, observacoes || null, codigo, session.empresa_codigo]
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
