import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;
  const { nome } = await request.json().catch(() => ({}));
  if (!nome) {
    return NextResponse.json({ error: 'Informe o nome do tipo.' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `UPDATE tipos_materia_prima SET nome=$1 WHERE codigo=$2 AND empresa_codigo=$3
     RETURNING codigo, nome`,
    [nome, codigo, session.empresa_codigo]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Tipo não encontrado.' }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;
  try {
    await pool.query(`DELETE FROM tipos_materia_prima WHERE codigo=$1 AND empresa_codigo=$2`, [
      codigo,
      session.empresa_codigo,
    ]);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23503') {
      return NextResponse.json(
        { error: 'Esse tipo está em uso em alguma matéria prima e não pode ser excluído.' },
        { status: 409 }
      );
    }
    throw err;
  }
}
