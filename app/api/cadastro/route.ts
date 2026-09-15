import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest) {
  const { nome, email, cpf, senha } = await request.json().catch(() => ({}));

  if (!nome || !email || !cpf || !senha) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }
  if (senha.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
  }

  try {
    await pool.query(
      `INSERT INTO usuarios (nome, email, cpf, nivel, senha, ativo)
       VALUES ($1, $2, $3, 'USUARIO', crypt($4, gen_salt('bf')), false)`,
      [nome, email, cpf, senha]
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      return NextResponse.json({ error: 'E-mail ou CPF já cadastrado.' }, { status: 409 });
    }
    throw err;
  }
}
