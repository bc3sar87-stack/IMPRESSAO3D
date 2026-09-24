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
  const { fabricante, modelo, consumo_w_hora, valor_aquisicao, vida_util_horas } = await request
    .json()
    .catch(() => ({}));

  if (!fabricante || !modelo || !consumo_w_hora) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }
  if (Number.isNaN(Number(consumo_w_hora))) {
    return NextResponse.json({ error: 'Consumo inválido.' }, { status: 400 });
  }
  if (
    (valor_aquisicao && (Number.isNaN(Number(valor_aquisicao)) || Number(valor_aquisicao) < 0)) ||
    (vida_util_horas && (Number.isNaN(Number(vida_util_horas)) || Number(vida_util_horas) < 0))
  ) {
    return NextResponse.json({ error: 'Valor de aquisição ou vida útil inválidos.' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `UPDATE equipamentos SET fabricante=$1, modelo=$2, consumo_w_hora=$3, valor_aquisicao=$4, vida_util_horas=$5
     WHERE codigo=$6 AND empresa_codigo=$7
     RETURNING codigo, fabricante, modelo, consumo_w_hora, valor_aquisicao, vida_util_horas`,
    [fabricante, modelo, consumo_w_hora, valor_aquisicao || null, vida_util_horas || null, codigo, session.empresa_codigo]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Equipamento não encontrado.' }, { status: 404 });
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
  await pool.query(`DELETE FROM equipamentos WHERE codigo=$1 AND empresa_codigo=$2`, [
    codigo,
    session.empresa_codigo,
  ]);
  return NextResponse.json({ ok: true });
}
