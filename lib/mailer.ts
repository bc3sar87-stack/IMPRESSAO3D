import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';
import { pool } from './db';

interface EmailConfig {
  ativo: boolean;
  servidor_smtp: string;
  porta: number;
  seguranca: 'SSL/TLS' | 'STARTTLS' | 'NENHUMA';
  usuario: string | null;
  senha: string | null;
  email_remetente: string;
  nome_remetente: string | null;
  email_cc: string | null;
}

export async function loadEmailConfig(): Promise<EmailConfig | null> {
  const key = process.env.EMAIL_ENCRYPTION_KEY;
  const { rows } = await pool.query(
    `SELECT ativo, servidor_smtp, porta, seguranca, usuario,
            pgp_sym_decrypt(senha, $1) AS senha,
            email_remetente, nome_remetente, email_cc
     FROM configuracao_email WHERE id = 1`,
    [key]
  );
  return rows[0] ?? null;
}

export function buildTransporter(config: EmailConfig) {
  return nodemailer.createTransport({
    host: config.servidor_smtp,
    port: config.porta,
    secure: config.seguranca === 'SSL/TLS',
    requireTLS: config.seguranca === 'STARTTLS',
    auth: config.usuario ? { user: config.usuario, pass: config.senha ?? undefined } : undefined,
  });
}

export async function sendSystemEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; content: Buffer; cid?: string; contentType?: string }[];
}) {
  const config = await loadEmailConfig();
  if (!config || !config.ativo || !config.servidor_smtp || !config.porta || !config.email_remetente) {
    throw new Error('Configuração de e-mail não está ativa ou está incompleta.');
  }

  const transporter = buildTransporter(config);
  await transporter.sendMail({
    from: config.nome_remetente
      ? `"${config.nome_remetente}" <${config.email_remetente}>`
      : config.email_remetente,
    to: opts.to,
    cc: config.email_cc || undefined,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    attachments: opts.attachments,
  });
}

const CONVITE_VALIDADE_HORAS = 48;

async function gerarTokenSenha(usuarioCodigo: number): Promise<string> {
  const token = randomBytes(32).toString('hex');

  // invalida links antigos ainda não usados para esse usuário
  await pool.query(`DELETE FROM tokens_senha WHERE usuario_codigo = $1 AND usado_em IS NULL`, [
    usuarioCodigo,
  ]);
  await pool.query(
    `INSERT INTO tokens_senha (token, usuario_codigo, expira_em)
     VALUES ($1, $2, now() + interval '${CONVITE_VALIDADE_HORAS} hours')`,
    [token, usuarioCodigo]
  );

  return token;
}

export async function criarConviteSenha(usuarioCodigo: number, nome: string, email: string) {
  const token = await gerarTokenSenha(usuarioCodigo);
  const baseUrl = process.env.APP_URL || '';
  const link = `${baseUrl}/definir-senha?token=${token}`;

  await sendSystemEmail({
    to: email,
    subject: 'Bem-vindo ao 3D print control - defina sua senha',
    text: `Olá, ${nome}!\n\nSeu cadastro no sistema 3D print control foi criado. Acesse o link abaixo para definir sua senha de acesso:\n\n${link}\n\nEste link expira em ${CONVITE_VALIDADE_HORAS} horas.`,
    html: `<p>Olá, ${nome}!</p><p>Seu cadastro no sistema 3D print control foi criado. Clique no link abaixo para definir sua senha de acesso:</p><p><a href="${link}">${link}</a></p><p>Este link expira em ${CONVITE_VALIDADE_HORAS} horas.</p>`,
  });
}

export async function enviarLinkRedefinicaoSenha(usuarioCodigo: number, nome: string, email: string) {
  const token = await gerarTokenSenha(usuarioCodigo);
  const baseUrl = process.env.APP_URL || '';
  const link = `${baseUrl}/definir-senha?token=${token}`;

  await sendSystemEmail({
    to: email,
    subject: 'Redefinição de senha - 3D print control',
    text: `Olá, ${nome}!\n\nRecebemos um pedido para redefinir sua senha no 3D print control. Acesse o link abaixo para escolher uma nova senha:\n\n${link}\n\nSe você não pediu isso, pode ignorar este e-mail. Este link expira em ${CONVITE_VALIDADE_HORAS} horas.`,
    html: `<p>Olá, ${nome}!</p><p>Recebemos um pedido para redefinir sua senha no 3D print control. Clique no link abaixo para escolher uma nova senha:</p><p><a href="${link}">${link}</a></p><p>Se você não pediu isso, pode ignorar este e-mail. Este link expira em ${CONVITE_VALIDADE_HORAS} horas.</p>`,
  });
}
