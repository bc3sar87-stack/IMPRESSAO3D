import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { codigo } = await params;
  const { nome, email, cpf, nivel, senha } = await request.json().catch(() => ({}));

  if (!nome || !email || !cpf || !nivel) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }
  if (nivel !== 'USUARIO' && nivel !== 'ADMINISTRADOR') {
    return NextResponse.json({ error: 'Nível inválido.' }, { status: 400 });
  }

  try {
    const { rows } = senha
      ? await pool.query(
          `UPDATE usuarios SET nome=$1, email=$2, cpf=$3, nivel=$4, senha=crypt($5, gen_salt('bf'))
           WHERE codigo=$6
           RETURNING codigo, nome, email, cpf, nivel`,
          [nome, email, cpf, nivel, senha, codigo]
        )
      : await pool.query(
          `UPDATE usuarios SET nome=$1, email=$2, cpf=$3, nivel=$4
           WHERE codigo=$5
           RETURNING codigo, nome, email, cpf, nivel`,
          [nome, email, cpf, nivel, codigo]
        );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      return NextResponse.json({ error: 'E-mail ou CPF já cadastrado.' }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { codigo } = await params;

  if (Number(codigo) === session.codigo) {
    return NextResponse.json({ error: 'Você não pode excluir seu próprio usuário.' }, { status: 400 });
  }

  await pool.query(`DELETE FROM usuarios WHERE codigo=$1`, [codigo]);
  return NextResponse.json({ ok: true });
}
