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
  const { tipo_codigo, marca, descricao, cor } = await request.json().catch(() => ({}));

  if (!tipo_codigo || !marca || !descricao || !cor) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }

  const { rows: tipoRows } = await pool.query(
    `SELECT 1 FROM tipos_materia_prima WHERE codigo=$1 AND empresa_codigo=$2`,
    [tipo_codigo, session.empresa_codigo]
  );
  if (tipoRows.length === 0) {
    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `UPDATE materia_prima SET tipo_codigo=$1, marca=$2, descricao=$3, cor=$4
     WHERE codigo=$5 AND empresa_codigo=$6
     RETURNING codigo`,
    [tipo_codigo, marca, descricao, cor, codigo, session.empresa_codigo]
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
