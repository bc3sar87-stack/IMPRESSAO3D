import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { criarConviteSenha } from '@/lib/mailer';

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { rows } = await pool.query(
    `SELECT codigo, nome, email, cpf, nivel, (senha IS NOT NULL) AS tem_senha
     FROM usuarios ORDER BY codigo`
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { nome, email, cpf, nivel } = await request.json().catch(() => ({}));

  if (!nome || !email || !cpf || !nivel) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }
  if (nivel !== 'USUARIO' && nivel !== 'ADMINISTRADOR') {
    return NextResponse.json({ error: 'Nível inválido.' }, { status: 400 });
  }

  let usuario;
  try {
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nome, email, cpf, nivel, senha)
       VALUES ($1, $2, $3, $4, NULL)
       RETURNING codigo, nome, email, cpf, nivel`,
      [nome, email, cpf, nivel]
    );
    usuario = rows[0];
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      return NextResponse.json({ error: 'E-mail ou CPF já cadastrado.' }, { status: 409 });
    }
    throw err;
  }

  try {
    await criarConviteSenha(usuario.codigo, usuario.nome, usuario.email);
    return NextResponse.json({ ...usuario, tem_senha: false, convite_enviado: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao enviar e-mail.';
    return NextResponse.json(
      { ...usuario, tem_senha: false, convite_enviado: false, convite_erro: message },
      { status: 201 }
    );
  }
}
