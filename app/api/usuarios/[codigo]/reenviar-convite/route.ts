import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { criarConviteSenha } from '@/lib/mailer';

export async function POST(_request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { codigo } = await params;
  const { rows } = await pool.query(
    `SELECT codigo, nome, email, (senha IS NOT NULL) AS tem_senha FROM usuarios WHERE codigo=$1`,
    [codigo]
  );

  const usuario = rows[0];
  if (!usuario) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  }
  if (usuario.tem_senha) {
    return NextResponse.json({ error: 'Usuário já definiu a senha.' }, { status: 400 });
  }

  try {
    await criarConviteSenha(usuario.codigo, usuario.nome, usuario.email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao enviar e-mail.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
