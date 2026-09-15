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
  const { tipo_codigo, marca, descricao, cor, unidade_medida, fornecedor, valor_custo } =
    await request.json().catch(() => ({}));

  if (!tipo_codigo || !marca || !descricao || !cor || !unidade_medida) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }
  if (unidade_medida !== 'UN' && unidade_medida !== 'G') {
    return NextResponse.json({ error: 'Unidade de medida inválida.' }, { status: 400 });
  }
  if (valor_custo !== undefined && valor_custo !== null && valor_custo !== '' && Number.isNaN(Number(valor_custo))) {
    return NextResponse.json({ error: 'Valor custo inválido.' }, { status: 400 });
  }

  const { rows: tipoRows } = await pool.query(
    `SELECT 1 FROM tipos_materia_prima WHERE codigo=$1 AND empresa_codigo=$2`,
    [tipo_codigo, session.empresa_codigo]
  );
  if (tipoRows.length === 0) {
    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `UPDATE materia_prima SET tipo_codigo=$1, marca=$2, descricao=$3, cor=$4, unidade_medida=$5, fornecedor=$6, valor_custo=$7
     WHERE codigo=$8 AND empresa_codigo=$9
     RETURNING codigo`,
    [
      tipo_codigo,
      marca,
      descricao,
      cor,
      unidade_medida,
      fornecedor || null,
      valor_custo || null,
      codigo,
      session.empresa_codigo,
    ]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Matéria prima não encontrada.' }, { status: 404 });
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
  await pool.query(`DELETE FROM materia_prima WHERE codigo=$1 AND empresa_codigo=$2`, [
    codigo,
    session.empresa_codigo,
  ]);
  return NextResponse.json({ ok: true });
}
