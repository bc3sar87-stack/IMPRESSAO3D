import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';

const TIPOS_VALIDOS = ['CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA'];

export async function GET() {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ chave_pix: '', tipo_chave: '', nome_recebedor: '', cidade: '', tem_qrcode: false });
  }

  const { rows } = await pool.query(
    `SELECT chave_pix, tipo_chave, nome_recebedor, cidade, (qrcode_imagem IS NOT NULL) AS tem_qrcode
     FROM configuracao_pix WHERE empresa_codigo = $1`,
    [session.empresa_codigo]
  );
  return NextResponse.json({
    chave_pix: rows[0]?.chave_pix || '',
    tipo_chave: rows[0]?.tipo_chave || '',
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

  const { chave_pix, tipo_chave, nome_recebedor, cidade, qrcode_base64, qrcode_tipo, remover_qrcode } =
    await request.json().catch(() => ({}));

  if (tipo_chave && !TIPOS_VALIDOS.includes(tipo_chave)) {
    return NextResponse.json({ error: 'Tipo de chave inválido.' }, { status: 400 });
  }

  const tipoChaveFinal = chave_pix ? tipo_chave || null : null;

  if (qrcode_base64) {
    await pool.query(
      `INSERT INTO configuracao_pix (empresa_codigo, chave_pix, tipo_chave, nome_recebedor, cidade, qrcode_imagem, qrcode_tipo, atualizado_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (empresa_codigo) DO UPDATE
         SET chave_pix = $2, tipo_chave = $3, nome_recebedor = $4, cidade = $5, qrcode_imagem = $6, qrcode_tipo = $7, atualizado_em = now()`,
      [
        session.empresa_codigo,
        chave_pix || null,
        tipoChaveFinal,
        nome_recebedor || null,
        cidade || null,
        Buffer.from(qrcode_base64, 'base64'),
        qrcode_tipo,
      ]
    );
  } else if (remover_qrcode) {
    await pool.query(
      `INSERT INTO configuracao_pix (empresa_codigo, chave_pix, tipo_chave, nome_recebedor, cidade, qrcode_imagem, qrcode_tipo, atualizado_em)
       VALUES ($1, $2, $3, $4, $5, NULL, NULL, now())
       ON CONFLICT (empresa_codigo) DO UPDATE
         SET chave_pix = $2, tipo_chave = $3, nome_recebedor = $4, cidade = $5, qrcode_imagem = NULL, qrcode_tipo = NULL, atualizado_em = now()`,
      [session.empresa_codigo, chave_pix || null, tipoChaveFinal, nome_recebedor || null, cidade || null]
    );
  } else {
    await pool.query(
      `INSERT INTO configuracao_pix (empresa_codigo, chave_pix, tipo_chave, nome_recebedor, cidade, atualizado_em)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (empresa_codigo) DO UPDATE
         SET chave_pix = $2, tipo_chave = $3, nome_recebedor = $4, cidade = $5, atualizado_em = now()`,
      [session.empresa_codigo, chave_pix || null, tipoChaveFinal, nome_recebedor || null, cidade || null]
    );
  }

  return NextResponse.json({ ok: true });
}
