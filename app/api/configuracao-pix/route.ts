import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';

export async function GET() {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ chave_pix: '', nome_recebedor: '', cidade: '', tem_qrcode: false });
  }

  const { rows } = await pool.query(
    `SELECT chave_pix, nome_recebedor, cidade, (qrcode_imagem IS NOT NULL) AS tem_qrcode
     FROM configuracao_pix WHERE empresa_codigo = $1`,
    [session.empresa_codigo]
  );
  return NextResponse.json({
    chave_pix: rows[0]?.chave_pix || '',
    nome_recebedor: rows[0]?.nome_recebedor || '',
    cidade: rows[0]?.cidade || '',
    tem_qrcode: rows[0]?.tem_qrcode || false,
  });
}

export async function PUT(request: NextRequest) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { chave_pix, nome_recebedor, cidade, qrcode_base64, qrcode_tipo, remover_qrcode } = await request
    .json()
    .catch(() => ({}));

  if (qrcode_base64) {
    await pool.query(
      `INSERT INTO configuracao_pix (empresa_codigo, chave_pix, nome_recebedor, cidade, qrcode_imagem, qrcode_tipo, atualizado_em)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (empresa_codigo) DO UPDATE
         SET chave_pix = $2, nome_recebedor = $3, cidade = $4, qrcode_imagem = $5, qrcode_tipo = $6, atualizado_em = now()`,
      [
        session.empresa_codigo,
        chave_pix || null,
        nome_recebedor || null,
        cidade || null,
        Buffer.from(qrcode_base64, 'base64'),
        qrcode_tipo,
      ]
    );
  } else if (remover_qrcode) {
    await pool.query(
      `INSERT INTO configuracao_pix (empresa_codigo, chave_pix, nome_recebedor, cidade, qrcode_imagem, qrcode_tipo, atualizado_em)
       VALUES ($1, $2, $3, $4, NULL, NULL, now())
       ON CONFLICT (empresa_codigo) DO UPDATE
         SET chave_pix = $2, nome_recebedor = $3, cidade = $4, qrcode_imagem = NULL, qrcode_tipo = NULL, atualizado_em = now()`,
      [session.empresa_codigo, chave_pix || null, nome_recebedor || null, cidade || null]
    );
  } else {
    await pool.query(
      `INSERT INTO configuracao_pix (empresa_codigo, chave_pix, nome_recebedor, cidade, atualizado_em)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (empresa_codigo) DO UPDATE
         SET chave_pix = $2, nome_recebedor = $3, cidade = $4, atualizado_em = now()`,
      [session.empresa_codigo, chave_pix || null, nome_recebedor || null, cidade || null]
    );
  }

  return NextResponse.json({ ok: true });
}
