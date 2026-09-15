import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const { empresa_codigo } = await request.json().catch(() => ({}));
  if (!empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT 1 FROM usuarios_empresas WHERE usuario_codigo = $1 AND empresa_codigo = $2`,
    [session.codigo, empresa_codigo]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Você não tem acesso a essa empresa.' }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, { ...session, empresa_codigo });
  return response;
}
