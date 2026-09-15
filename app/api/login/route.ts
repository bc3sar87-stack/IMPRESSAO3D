import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { signSession, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { email, senha } = await request.json().catch(() => ({ email: '', senha: '' }));

  if (!email || !senha) {
    return NextResponse.json({ error: 'Informe e-mail e senha.' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT codigo, nome, nivel
     FROM usuarios
     WHERE email = $1 AND senha = crypt($2, senha)`,
    [email, senha]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'E-mail ou senha inválidos.' }, { status: 401 });
  }

  const user = rows[0];
  const token = signSession({ codigo: user.codigo, nome: user.nome, nivel: user.nivel });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60,
  });
  return response;
}
