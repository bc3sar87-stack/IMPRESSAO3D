import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { destinatario } = await request.json().catch(() => ({}));
  if (!destinatario) {
    return NextResponse.json({ error: 'Informe o e-mail de destino.' }, { status: 400 });
  }

  const key = process.env.EMAIL_ENCRYPTION_KEY;
  const { rows } = await pool.query(
    `SELECT servidor_smtp, porta, seguranca, usuario,
            pgp_sym_decrypt(senha, $1) AS senha,
            email_remetente, nome_remetente, email_cc
     FROM configuracao_email WHERE id = 1`,
    [key]
  );

  const config = rows[0];
  if (!config || !config.servidor_smtp || !config.porta || !config.email_remetente) {
    return NextResponse.json(
      { error: 'Salve as configurações antes de testar.' },
      { status: 400 }
    );
  }

  const transporter = nodemailer.createTransport({
    host: config.servidor_smtp,
    port: config.porta,
    secure: config.seguranca === 'SSL/TLS',
    requireTLS: config.seguranca === 'STARTTLS',
    auth: config.usuario ? { user: config.usuario, pass: config.senha } : undefined,
  });

  try {
    await transporter.sendMail({
      from: config.nome_remetente
        ? `"${config.nome_remetente}" <${config.email_remetente}>`
        : config.email_remetente,
      to: destinatario,
      cc: config.email_cc || undefined,
      subject: 'E-mail de teste - IMPRESSAO3D',
      text: 'Este é um e-mail de teste enviado pelo sistema IMPRESSAO3D.',
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao enviar e-mail.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
