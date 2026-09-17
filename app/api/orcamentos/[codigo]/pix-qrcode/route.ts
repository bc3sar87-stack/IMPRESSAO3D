import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { gerarPayloadPix, gerarQrCodePixBuffer } from '@/lib/pix';

export async function GET(_request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await getSession();
  if (!session || !session.empresa_codigo) {
    return new NextResponse(null, { status: 404 });
  }

  const { codigo } = await params;

  const { rows: orcRows } = await pool.query(
    `SELECT valor_total FROM orcamentos WHERE codigo = $1 AND empresa_codigo = $2`,
    [codigo, session.empresa_codigo]
  );
  if (orcRows.length === 0) {
    return new NextResponse(null, { status: 404 });
  }

  const { rows: pixRows } = await pool.query(
    `SELECT chave_pix, tipo_chave, nome_recebedor, cidade FROM configuracao_pix WHERE empresa_codigo = $1`,
    [session.empresa_codigo]
  );
  const pix = pixRows[0];
  if (!pix || !pix.chave_pix || !pix.nome_recebedor || !pix.cidade) {
    return new NextResponse(null, { status: 404 });
  }

  const payload = gerarPayloadPix({
    chave: pix.chave_pix,
    tipoChave: pix.tipo_chave,
    nomeRecebedor: pix.nome_recebedor,
    cidade: pix.cidade,
    valor: Number(orcRows[0].valor_total),
    txid: `ORC${codigo}`,
  });
  const png = await gerarQrCodePixBuffer(payload);

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-cache, must-revalidate',
    },
  });
}
