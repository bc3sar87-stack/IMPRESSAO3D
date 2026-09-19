import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';

export async function GET(_request: Request, { params }: { params: Promise<{ lote_codigo: string }> }) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json([]);
  }

  const { lote_codigo } = await params;
  const { rows } = await pool.query(
    `SELECT codigo, tipo, quantidade, observacao, criado_em, orcamento_codigo
     FROM movimentacoes_estoque
     WHERE lote_codigo = $1 AND empresa_codigo = $2
     ORDER BY criado_em DESC, codigo DESC`,
    [lote_codigo, session.empresa_codigo]
  );
  return NextResponse.json(rows);
}
