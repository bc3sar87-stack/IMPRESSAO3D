import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;
  const { sigla, nome } = await request.json().catch(() => ({}));
  if (!sigla || !nome) {
    return NextResponse.json({ error: 'Informe a sigla e o nome.' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE unidades_medida SET sigla=$1, nome=$2 WHERE codigo=$3 AND empresa_codigo=$4
       RETURNING codigo, sigla, nome`,
      [sigla, nome, codigo, session.empresa_codigo]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Unidade não encontrada.' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      return NextResponse.json({ error: 'Já existe uma unidade com essa sigla.' }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;
  try {
    await pool.query(`DELETE FROM unidades_medida WHERE codigo=$1 AND empresa_codigo=$2`, [
      codigo,
      session.empresa_codigo,
    ]);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23503') {
      return NextResponse.json(
        { error: 'Essa unidade está em uso em alguma matéria prima e não pode ser excluída.' },
        { status: 409 }
      );
    }
    throw err;
  }
}
