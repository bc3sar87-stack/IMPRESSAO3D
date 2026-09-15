import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { signSession, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { token, senha } = await request.json().catch(() => ({}));

  if (!token || !senha) {
    return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
  }
  if (senha.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT usuario_codigo, expira_em, usado_em FROM tokens_senha WHERE token = $1`,
    [token]
  );
  const convite = rows[0];

  if (!convite) {
    return NextResponse.json({ error: 'Link inválido.' }, { status: 400 });
  }
  if (convite.usado_em) {
    return NextResponse.json({ error: 'Este link já foi utilizado.' }, { status: 400 });
  }
  if (new Date(convite.expira_em) < new Date()) {
    return NextResponse.json(
      { error: 'Este link expirou. Peça para o administrador reenviar o convite.' },
      { status: 400 }
    );
  }

  const { rows: usuarioRows } = await pool.query(
    `UPDATE usuarios SET senha = crypt($1, gen_salt('bf')) WHERE codigo = $2
     RETURNING codigo, nome, nivel`,
    [senha, convite.usuario_codigo]
  );
  const usuario = usuarioRows[0];

  await pool.query(`DELETE FROM tokens_senha WHERE usuario_codigo = $1`, [convite.usuario_codigo]);

  const sessionToken = signSession({ codigo: usuario.codigo, nome: usuario.nome, nivel: usuario.nivel });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60,
  });
  return response;
}
