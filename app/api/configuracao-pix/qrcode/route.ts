import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || !session.empresa_codigo) {
    return new NextResponse(null, { status: 404 });
  }

  const { rows } = await pool.query(
    `SELECT qrcode_imagem, qrcode_tipo FROM configuracao_pix WHERE empresa_codigo = $1`,
    [session.empresa_codigo]
  );

  const config = rows[0];
  if (!config || !config.qrcode_imagem) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(config.qrcode_imagem, {
    headers: {
      'Content-Type': config.qrcode_tipo || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
