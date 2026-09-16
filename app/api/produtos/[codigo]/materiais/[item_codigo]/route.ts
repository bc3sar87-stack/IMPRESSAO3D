import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ codigo: string; item_codigo: string }> }
) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo, item_codigo } = await params;
  await pool.query(
    `DELETE FROM produto_materiais WHERE codigo=$1 AND produto_codigo=$2 AND empresa_codigo=$3`,
    [item_codigo, codigo, session.empresa_codigo]
  );
  return NextResponse.json({ ok: true });
}
