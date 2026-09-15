import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ codigo: string; item_codigo: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo, item_codigo } = await params;
  await pool.query(
    `DELETE FROM orcamento_itens WHERE codigo=$1 AND orcamento_codigo=$2 AND empresa_codigo=$3`,
    [item_codigo, codigo, session.empresa_codigo]
  );

  await pool.query(
    `UPDATE orcamentos SET valor_total = (
       SELECT COALESCE(SUM(quantidade * valor_unitario), 0)
       FROM orcamento_itens WHERE orcamento_codigo = $1
     ) WHERE codigo = $1 AND empresa_codigo = $2`,
    [codigo, session.empresa_codigo]
  );

  return NextResponse.json({ ok: true });
}
