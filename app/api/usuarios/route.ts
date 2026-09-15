import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { rows } = await pool.query(
    `SELECT codigo, nome, email, cpf, nivel FROM usuarios ORDER BY codigo`
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { nome, email, cpf, nivel, senha } = await request.json().catch(() => ({}));

  if (!nome || !email || !cpf || !nivel || !senha) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }
  if (nivel !== 'USUARIO' && nivel !== 'ADMINISTRADOR') {
    return NextResponse.json({ error: 'Nível inválido.' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nome, email, cpf, nivel, senha)
       VALUES ($1, $2, $3, $4, crypt($5, gen_salt('bf')))
       RETURNING codigo, nome, email, cpf, nivel`,
      [nome, email, cpf, nivel, senha]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      return NextResponse.json({ error: 'E-mail ou CPF já cadastrado.' }, { status: 409 });
    }
    throw err;
  }
}
