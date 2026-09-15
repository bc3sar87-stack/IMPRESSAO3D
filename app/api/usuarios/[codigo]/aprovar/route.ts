import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function POST(_request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { codigo } = await params;
  const { rows } = await pool.query(
    `UPDATE usuarios SET ativo = true WHERE codigo = $1 RETURNING codigo`,
    [codigo]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
