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
  const { descricao, valor, data_vencimento, data_recebimento, status } = await request
    .json()
    .catch(() => ({}));

  if (!descricao || valor === undefined || valor === '' || !data_vencimento || !status) {
    return NextResponse.json(
      { error: 'Informe descrição, valor, vencimento e status.' },
      { status: 400 }
    );
  }
  if (Number(valor) <= 0) {
    return NextResponse.json({ error: 'Valor deve ser maior que zero.' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `UPDATE contas_receber
     SET descricao=$1, valor=$2, data_vencimento=$3, data_recebimento=$4, status=$5
     WHERE codigo=$6 AND empresa_codigo=$7
     RETURNING codigo`,
    [descricao, valor, data_vencimento, data_recebimento || null, status, codigo, session.empresa_codigo]
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
  await pool.query(`DELETE FROM contas_receber WHERE codigo=$1 AND empresa_codigo=$2`, [
    codigo,
    session.empresa_codigo,
  ]);
  return NextResponse.json({ ok: true });
}
