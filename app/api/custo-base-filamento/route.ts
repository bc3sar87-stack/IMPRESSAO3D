import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';

export async function GET() {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ valor: null });
  }

  const { rows } = await pool.query(
    `SELECT valor FROM custo_base_filamento WHERE empresa_codigo = $1`,
    [session.empresa_codigo]
  );
  return NextResponse.json({ valor: rows[0]?.valor ?? null });
}

export async function PUT(request: NextRequest) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { valor } = await request.json().catch(() => ({}));
  if (valor === undefined || valor === null || Number.isNaN(Number(valor))) {
    return NextResponse.json({ error: 'Informe um valor válido.' }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO custo_base_filamento (empresa_codigo, valor, atualizado_em)
     VALUES ($1, $2, now())
     ON CONFLICT (empresa_codigo) DO UPDATE SET valor = $2, atualizado_em = now()`,
    [session.empresa_codigo, valor]
  );
  return NextResponse.json({ ok: true });
}
