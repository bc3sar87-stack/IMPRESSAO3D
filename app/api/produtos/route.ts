import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json([]);
  }

  const { rows } = await pool.query(
    `SELECT codigo, descricao, link_stl, stl_nome, (foto IS NOT NULL) AS tem_foto
     FROM produtos WHERE empresa_codigo = $1 ORDER BY codigo`,
    [session.empresa_codigo]
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa para cadastrar produtos.' }, { status: 400 });
  }

  const { descricao, link_stl, foto_base64, foto_tipo } = await request.json().catch(() => ({}));

  if (!descricao) {
    return NextResponse.json({ error: 'Informe a descrição.' }, { status: 400 });
  }

  const foto = foto_base64 ? Buffer.from(foto_base64, 'base64') : null;

  const { rows } = await pool.query(
    `INSERT INTO produtos (descricao, link_stl, foto, foto_tipo, empresa_codigo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING codigo`,
    [descricao, link_stl || null, foto, foto ? foto_tipo : null, session.empresa_codigo]
  );
  return NextResponse.json({ codigo: rows[0].codigo }, { status: 201 });
}
