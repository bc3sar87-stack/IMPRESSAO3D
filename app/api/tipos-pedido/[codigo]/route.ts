import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;
  const { nome, movimenta_estoque, gera_conta_receber } = await request.json().catch(() => ({}));
  if (!nome) {
    return NextResponse.json({ error: 'Informe o nome do tipo de pedido.' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `UPDATE tipos_pedido SET nome=$1, movimenta_estoque=$2, gera_conta_receber=$3
     WHERE codigo=$4 AND empresa_codigo=$5
     RETURNING codigo, nome, movimenta_estoque, gera_conta_receber`,
    [
      nome,
      movimenta_estoque === false ? false : true,
      gera_conta_receber === false ? false : true,
      codigo,
      session.empresa_codigo,
    ]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Tipo de pedido não encontrado.' }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;
  await pool.query(`DELETE FROM tipos_pedido WHERE codigo=$1 AND empresa_codigo=$2`, [
    codigo,
    session.empresa_codigo,
  ]);
  return NextResponse.json({ ok: true });
}
