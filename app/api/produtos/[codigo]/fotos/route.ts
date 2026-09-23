import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';

const MAX_SIZE = 4 * 1024 * 1024; // 4MB

export async function GET(_request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json([]);
  }

  const { codigo } = await params;
  const { rows } = await pool.query(
    `SELECT codigo, criado_em FROM produto_fotos
     WHERE produto_codigo = $1 AND empresa_codigo = $2
     ORDER BY criado_em DESC, codigo DESC`,
    [codigo, session.empresa_codigo]
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;
  const { imagem_base64, imagem_tipo } = await request.json().catch(() => ({}));

  if (!imagem_base64 || !imagem_tipo || !String(imagem_tipo).startsWith('image/')) {
    return NextResponse.json({ error: 'Envie uma imagem válida.' }, { status: 400 });
  }

  const buffer = Buffer.from(imagem_base64, 'base64');
  if (buffer.length > MAX_SIZE) {
    return NextResponse.json({ error: 'A imagem deve ter no máximo 4MB.' }, { status: 400 });
  }

  const { rows: produtoRows } = await pool.query(
    `SELECT 1 FROM produtos WHERE codigo=$1 AND empresa_codigo=$2`,
    [codigo, session.empresa_codigo]
  );
  if (produtoRows.length === 0) {
    return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
  }

  const { rows } = await pool.query(
    `INSERT INTO produto_fotos (produto_codigo, imagem, imagem_tipo, empresa_codigo)
     VALUES ($1, $2, $3, $4)
     RETURNING codigo, criado_em`,
    [codigo, buffer, imagem_tipo, session.empresa_codigo]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
