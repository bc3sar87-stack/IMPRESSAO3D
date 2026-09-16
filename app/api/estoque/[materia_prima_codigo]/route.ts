import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ materia_prima_codigo: string }> }
) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json([]);
  }

  const { materia_prima_codigo } = await params;

  const { rows } = await pool.query(
    `SELECT codigo, tipo, quantidade, observacao, criado_em
     FROM movimentacoes_estoque
     WHERE materia_prima_codigo = $1 AND empresa_codigo = $2
     ORDER BY criado_em DESC, codigo DESC`,
    [materia_prima_codigo, session.empresa_codigo]
  );
  return NextResponse.json(rows);
}
