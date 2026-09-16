import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';

export async function GET() {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ valor_percentual: null });
  }

  const { rows } = await pool.query(
    `SELECT valor_percentual FROM markup_padrao WHERE empresa_codigo = $1`,
    [session.empresa_codigo]
  );
  return NextResponse.json({ valor_percentual: rows[0]?.valor_percentual ?? null });
}

export async function PUT(request: NextRequest) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { valor_percentual } = await request.json().catch(() => ({}));
  if (valor_percentual === undefined || valor_percentual === null || Number.isNaN(Number(valor_percentual))) {
    return NextResponse.json({ error: 'Informe um valor válido.' }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO markup_padrao (empresa_codigo, valor_percentual, atualizado_em)
     VALUES ($1, $2, now())
     ON CONFLICT (empresa_codigo) DO UPDATE SET valor_percentual = $2, atualizado_em = now()`,
    [session.empresa_codigo, valor_percentual]
  );
  return NextResponse.json({ ok: true });
}
