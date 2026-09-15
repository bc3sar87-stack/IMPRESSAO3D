import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { rows } = await pool.query(
    `SELECT codigo, cnpj, razao_social FROM empresa ORDER BY codigo`
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { cnpj, razao_social } = await request.json().catch(() => ({}));

  if (!cnpj || !razao_social) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO empresa (cnpj, razao_social) VALUES ($1, $2)
       RETURNING codigo, cnpj, razao_social`,
      [cnpj, razao_social]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      return NextResponse.json({ error: 'CNPJ já cadastrado.' }, { status: 409 });
    }
    throw err;
  }
}
