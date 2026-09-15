import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json([]);
  }

  const { rows } = await pool.query(
    `SELECT o.codigo, o.data, o.status, o.observacoes, o.valor_total, o.cliente_codigo, c.nome AS cliente_nome
     FROM orcamentos o
     JOIN clientes c ON c.codigo = o.cliente_codigo
     WHERE o.empresa_codigo = $1
     ORDER BY o.codigo DESC`,
    [session.empresa_codigo]
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa para criar orçamentos.' }, { status: 400 });
  }

  const { cliente_codigo, data, status, observacoes } = await request.json().catch(() => ({}));

  if (!cliente_codigo) {
    return NextResponse.json({ error: 'Selecione o cliente.' }, { status: 400 });
  }

  const { rows: clienteRows } = await pool.query(
    `SELECT 1 FROM clientes WHERE codigo=$1 AND empresa_codigo=$2`,
    [cliente_codigo, session.empresa_codigo]
  );
  if (clienteRows.length === 0) {
    return NextResponse.json({ error: 'Cliente inválido.' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO orcamentos (cliente_codigo, data, status, observacoes, empresa_codigo)
     VALUES ($1, COALESCE($2, CURRENT_DATE), COALESCE($3, 'ABERTO'), $4, $5)
     RETURNING codigo`,
    [cliente_codigo, data || null, status || null, observacoes || null, session.empresa_codigo]
  );
  return NextResponse.json({ codigo: rows[0].codigo }, { status: 201 });
}
