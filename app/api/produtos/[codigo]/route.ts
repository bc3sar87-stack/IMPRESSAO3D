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
  const { descricao, link_stl, foto_base64, foto_tipo } = await request.json().catch(() => ({}));

  if (!descricao) {
    return NextResponse.json({ error: 'Informe a descrição.' }, { status: 400 });
  }

  const { rows } = foto_base64
    ? await pool.query(
        `UPDATE produtos SET descricao=$1, link_stl=$2, foto=$3, foto_tipo=$4
         WHERE codigo=$5 AND empresa_codigo=$6
         RETURNING codigo`,
        [descricao, link_stl || null, Buffer.from(foto_base64, 'base64'), foto_tipo, codigo, session.empresa_codigo]
      )
    : await pool.query(
        `UPDATE produtos SET descricao=$1, link_stl=$2
         WHERE codigo=$3 AND empresa_codigo=$4
         RETURNING codigo`,
        [descricao, link_stl || null, codigo, session.empresa_codigo]
      );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
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
  await pool.query(`DELETE FROM produtos WHERE codigo=$1 AND empresa_codigo=$2`, [
    codigo,
    session.empresa_codigo,
  ]);
  return NextResponse.json({ ok: true });
}
