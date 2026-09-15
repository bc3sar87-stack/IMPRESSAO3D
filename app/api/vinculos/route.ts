import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { rows } = await pool.query(
    `SELECT usuario_codigo, empresa_codigo FROM usuarios_empresas`
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { usuario_codigo, empresa_codigo } = await request.json().catch(() => ({}));
  if (!usuario_codigo || !empresa_codigo) {
    return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO usuarios_empresas (usuario_codigo, empresa_codigo)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [usuario_codigo, empresa_codigo]
  );
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const usuario_codigo = request.nextUrl.searchParams.get('usuario_codigo');
  const empresa_codigo = request.nextUrl.searchParams.get('empresa_codigo');
  if (!usuario_codigo || !empresa_codigo) {
    return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
  }

  await pool.query(
    `DELETE FROM usuarios_empresas WHERE usuario_codigo=$1 AND empresa_codigo=$2`,
    [usuario_codigo, empresa_codigo]
  );
  return NextResponse.json({ ok: true });
}
