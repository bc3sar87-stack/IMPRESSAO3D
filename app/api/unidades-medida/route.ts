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
    `SELECT codigo, sigla, nome FROM unidades_medida WHERE empresa_codigo = $1 ORDER BY nome`,
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
    return NextResponse.json({ error: 'Selecione uma empresa para cadastrar unidades.' }, { status: 400 });
  }

  const { sigla, nome } = await request.json().catch(() => ({}));
  if (!sigla || !nome) {
    return NextResponse.json({ error: 'Informe a sigla e o nome.' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO unidades_medida (sigla, nome, empresa_codigo) VALUES ($1, $2, $3)
       RETURNING codigo, sigla, nome`,
      [sigla, nome, session.empresa_codigo]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      return NextResponse.json({ error: 'Já existe uma unidade com essa sigla.' }, { status: 409 });
    }
    throw err;
  }
}
