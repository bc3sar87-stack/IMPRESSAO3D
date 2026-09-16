import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';

export async function DELETE(_request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;
  const { rowCount } = await pool.query(
    `DELETE FROM movimentacoes_estoque WHERE codigo=$1 AND empresa_codigo=$2`,
    [codigo, session.empresa_codigo]
  );
  if (rowCount === 0) {
    return NextResponse.json({ error: 'Movimentação não encontrada.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
