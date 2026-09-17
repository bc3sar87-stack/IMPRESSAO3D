import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { gerarPayloadPix, gerarQrCodePixBuffer } from '@/lib/pix';

export async function GET() {
  const session = await getSession();
  if (!session || !session.empresa_codigo) {
    return new NextResponse(null, { status: 404 });
  }

  const { rows } = await pool.query(
    `SELECT chave_pix, tipo_chave, nome_recebedor, cidade FROM configuracao_pix WHERE empresa_codigo = $1`,
    [session.empresa_codigo]
  );

  const config = rows[0];
  if (!config || !config.chave_pix || !config.nome_recebedor || !config.cidade) {
    return new NextResponse(null, { status: 404 });
  }

  const payload = gerarPayloadPix({
    chave: config.chave_pix,
    tipoChave: config.tipo_chave,
    nomeRecebedor: config.nome_recebedor,
    cidade: config.cidade,
  });
  const png = await gerarQrCodePixBuffer(payload);

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-cache, must-revalidate',
    },
  });
}
