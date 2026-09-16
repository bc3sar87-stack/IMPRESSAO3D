import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || !session.empresa_codigo) {
    return new NextResponse(null, { status: 404 });
  }

  const { rows } = await pool.query(`SELECT logo_imagem, logo_tipo FROM empresa WHERE codigo = $1`, [
    session.empresa_codigo,
  ]);

  const empresa = rows[0];
  if (!empresa || !empresa.logo_imagem) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(empresa.logo_imagem, {
    headers: {
      'Content-Type': empresa.logo_tipo || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
