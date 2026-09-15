import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { codigo } = await params;
  const { cnpj, razao_social } = await request.json().catch(() => ({}));

  if (!cnpj || !razao_social) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE empresa SET cnpj=$1, razao_social=$2 WHERE codigo=$3
       RETURNING codigo, cnpj, razao_social`,
      [cnpj, razao_social, codigo]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      return NextResponse.json({ error: 'CNPJ já cadastrado.' }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { codigo } = await params;
  await pool.query(`DELETE FROM empresa WHERE codigo=$1`, [codigo]);
  return NextResponse.json({ ok: true });
}
