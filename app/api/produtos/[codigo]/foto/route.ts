import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(_request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await getSession();
  if (!session || !session.empresa_codigo) {
    return new NextResponse(null, { status: 404 });
  }

  const { codigo } = await params;
  const { rows } = await pool.query(
    `SELECT foto, foto_tipo FROM produtos WHERE codigo = $1 AND empresa_codigo = $2`,
    [codigo, session.empresa_codigo]
  );

  const produto = rows[0];
  if (!produto || !produto.foto) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(produto.foto, {
    headers: {
      'Content-Type': produto.foto_tipo || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
