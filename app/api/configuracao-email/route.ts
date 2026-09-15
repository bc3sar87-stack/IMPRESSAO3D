import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { rows } = await pool.query(
    `SELECT ativo, servidor_smtp, porta, seguranca, usuario,
            (senha IS NOT NULL) AS tem_senha,
            email_remetente, nome_remetente, email_cc
     FROM configuracao_email WHERE id = 1`
  );

  if (rows.length === 0) {
    return NextResponse.json({
      ativo: false,
      servidor_smtp: '',
      porta: 465,
      seguranca: 'SSL/TLS',
      usuario: '',
      tem_senha: false,
      email_remetente: '',
      nome_remetente: '',
      email_cc: '',
    });
  }

  return NextResponse.json(rows[0]);
}

export async function PUT(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    ativo = false,
    servidor_smtp,
    porta,
    seguranca = 'SSL/TLS',
    usuario = '',
    senha,
    email_remetente,
    nome_remetente = '',
    email_cc = '',
  } = body;

  if (!servidor_smtp || !porta || !email_remetente) {
    return NextResponse.json(
      { error: 'Servidor SMTP, porta e e-mail remetente são obrigatórios.' },
      { status: 400 }
    );
  }
  if (!['SSL/TLS', 'STARTTLS', 'NENHUMA'].includes(seguranca)) {
    return NextResponse.json({ error: 'Segurança inválida.' }, { status: 400 });
  }

  const key = process.env.EMAIL_ENCRYPTION_KEY;
  if (senha) {
    if (!key) {
      return NextResponse.json({ error: 'EMAIL_ENCRYPTION_KEY não configurada.' }, { status: 500 });
    }
    await pool.query(
      `INSERT INTO configuracao_email
         (id, ativo, servidor_smtp, porta, seguranca, usuario, senha, email_remetente, nome_remetente, email_cc, atualizado_em)
       VALUES (1, $1, $2, $3, $4, $5, pgp_sym_encrypt($6, $7), $8, $9, $10, now())
       ON CONFLICT (id) DO UPDATE SET
         ativo=$1, servidor_smtp=$2, porta=$3, seguranca=$4, usuario=$5,
         senha=pgp_sym_encrypt($6, $7), email_remetente=$8, nome_remetente=$9, email_cc=$10, atualizado_em=now()`,
      [ativo, servidor_smtp, porta, seguranca, usuario, senha, key, email_remetente, nome_remetente, email_cc]
    );
  } else {
    await pool.query(
      `INSERT INTO configuracao_email
         (id, ativo, servidor_smtp, porta, seguranca, usuario, email_remetente, nome_remetente, email_cc, atualizado_em)
       VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, now())
       ON CONFLICT (id) DO UPDATE SET
         ativo=$1, servidor_smtp=$2, porta=$3, seguranca=$4, usuario=$5,
         email_remetente=$6, nome_remetente=$7, email_cc=$8, atualizado_em=now()`,
      [ativo, servidor_smtp, porta, seguranca, usuario, email_remetente, nome_remetente, email_cc]
    );
  }

  return NextResponse.json({ ok: true });
}
