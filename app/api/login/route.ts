import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { setSessionCookie } from '@/lib/auth';

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

  const { rows: empresas } = await pool.query(
    `SELECT empresa_codigo FROM usuarios_empresas WHERE usuario_codigo = $1`,
    [user.codigo]
  );

  const multiEmpresa = empresas.length > 1;
  const empresa_codigo = empresas.length === 1 ? empresas[0].empresa_codigo : null;

  const response = NextResponse.json({
    ok: true,
    redirect: multiEmpresa ? '/selecionar-empresa' : '/dashboard',
  });
  setSessionCookie(response, {
    codigo: user.codigo,
    nome: user.nome,
    nivel: user.nivel,
    empresa_codigo,
    multiEmpresa,
  });
  return response;
}
