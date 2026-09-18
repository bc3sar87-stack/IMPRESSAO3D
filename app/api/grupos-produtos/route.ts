import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';

export async function GET() {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json([]);
  }

  const { rows } = await pool.query(
    `SELECT codigo, nome FROM grupos_produtos WHERE empresa_codigo = $1 ORDER BY nome`,
    [session.empresa_codigo]
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa para cadastrar grupos.' }, { status: 400 });
  }

  const { nome } = await request.json().catch(() => ({}));
  if (!nome) {
    return NextResponse.json({ error: 'Informe o nome do grupo.' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO grupos_produtos (nome, empresa_codigo) VALUES ($1, $2)
     RETURNING codigo, nome`,
    [nome, session.empresa_codigo]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
