import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, requireUsuario } from '@/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ codigo: string; foto_codigo: string }> }
) {
  const session = await getSession();
  if (!session || !session.empresa_codigo) {
    return new NextResponse(null, { status: 404 });
  }

  const { codigo, foto_codigo } = await params;
  const { rows } = await pool.query(
    `SELECT imagem, imagem_tipo FROM produto_fotos
     WHERE codigo = $1 AND produto_codigo = $2 AND empresa_codigo = $3`,
    [foto_codigo, codigo, session.empresa_codigo]
  );

  const foto = rows[0];
  if (!foto) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(foto.imagem, {
    headers: {
      'Content-Type': foto.imagem_tipo,
      'Cache-Control': 'private, no-cache, must-revalidate',
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ codigo: string; foto_codigo: string }> }
) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo, foto_codigo } = await params;
  await pool.query(
    `DELETE FROM produto_fotos WHERE codigo=$1 AND produto_codigo=$2 AND empresa_codigo=$3`,
    [foto_codigo, codigo, session.empresa_codigo]
  );
  return NextResponse.json({ ok: true });
}
