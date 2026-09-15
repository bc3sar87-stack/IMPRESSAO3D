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
  const { tipo_codigo, marca, descricao, cor, unidade_medida } = await request.json().catch(() => ({}));

  if (!tipo_codigo || !marca || !descricao || !cor || !unidade_medida) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }
  if (unidade_medida !== 'UN' && unidade_medida !== 'G') {
    return NextResponse.json({ error: 'Unidade de medida inválida.' }, { status: 400 });
  }

  const { rows: tipoRows } = await pool.query(
    `SELECT 1 FROM tipos_materia_prima WHERE codigo=$1 AND empresa_codigo=$2`,
    [tipo_codigo, session.empresa_codigo]
  );
  if (tipoRows.length === 0) {
    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `UPDATE materia_prima SET tipo_codigo=$1, marca=$2, descricao=$3, cor=$4, unidade_medida=$5
     WHERE codigo=$6 AND empresa_codigo=$7
     RETURNING codigo`,
    [tipo_codigo, marca, descricao, cor, unidade_medida, codigo, session.empresa_codigo]
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
