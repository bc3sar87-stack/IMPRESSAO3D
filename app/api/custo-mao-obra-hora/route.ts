import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ valor_hora: null });
  }

  const { rows } = await pool.query(
    `SELECT valor_hora FROM custo_mao_obra_hora WHERE empresa_codigo = $1`,
    [session.empresa_codigo]
  );
  return NextResponse.json({ valor_hora: rows[0]?.valor_hora ?? null });
}

export async function PUT(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { valor_hora } = await request.json().catch(() => ({}));
  if (valor_hora === undefined || valor_hora === null || Number.isNaN(Number(valor_hora))) {
    return NextResponse.json({ error: 'Informe um valor válido.' }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO custo_mao_obra_hora (empresa_codigo, valor_hora, atualizado_em)
     VALUES ($1, $2, now())
     ON CONFLICT (empresa_codigo) DO UPDATE SET valor_hora = $2, atualizado_em = now()`,
    [session.empresa_codigo, valor_hora]
  );
  return NextResponse.json({ ok: true });
}
