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
  const { nome } = await request.json().catch(() => ({}));
  if (!nome) {
    return NextResponse.json({ error: 'Informe o nome do grupo.' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `UPDATE grupos_produtos SET nome=$1 WHERE codigo=$2 AND empresa_codigo=$3
     RETURNING codigo, nome`,
    [nome, codigo, session.empresa_codigo]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Grupo não encontrado.' }, { status: 404 });
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
  await pool.query(`DELETE FROM grupos_produtos WHERE codigo=$1 AND empresa_codigo=$2`, [
    codigo,
    session.empresa_codigo,
  ]);
  return NextResponse.json({ ok: true });
}
