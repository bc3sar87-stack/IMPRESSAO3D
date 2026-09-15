import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

async function recalcularTotal(orcamentoCodigo: string, empresaCodigo: number) {
  await pool.query(
    `UPDATE orcamentos SET valor_total = (
       SELECT COALESCE(SUM(quantidade * valor_unitario), 0)
       FROM orcamento_itens WHERE orcamento_codigo = $1
     ) WHERE codigo = $1 AND empresa_codigo = $2`,
    [orcamentoCodigo, empresaCodigo]
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json([]);
  }

  const { codigo } = await params;
  const { rows } = await pool.query(
    `SELECT oi.codigo, oi.produto_codigo, p.descricao AS produto_descricao, oi.quantidade, oi.valor_unitario,
            (oi.quantidade * oi.valor_unitario) AS subtotal
     FROM orcamento_itens oi
     JOIN produtos p ON p.codigo = oi.produto_codigo
     WHERE oi.orcamento_codigo = $1 AND oi.empresa_codigo = $2
     ORDER BY oi.codigo`,
    [codigo, session.empresa_codigo]
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;
  const { produto_codigo, quantidade, valor_unitario } = await request.json().catch(() => ({}));

  if (!produto_codigo || !quantidade || valor_unitario === undefined || valor_unitario === '') {
    return NextResponse.json({ error: 'Selecione o produto e informe quantidade e valor.' }, { status: 400 });
  }
  if (Number(quantidade) <= 0) {
    return NextResponse.json({ error: 'Quantidade deve ser maior que zero.' }, { status: 400 });
  }
  if (Number(valor_unitario) < 0) {
    return NextResponse.json({ error: 'Valor unitário inválido.' }, { status: 400 });
  }

  const { rows: orcRows } = await pool.query(
    `SELECT 1 FROM orcamentos WHERE codigo=$1 AND empresa_codigo=$2`,
    [codigo, session.empresa_codigo]
  );
  if (orcRows.length === 0) {
    return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 });
  }

  const { rows: prodRows } = await pool.query(
    `SELECT 1 FROM produtos WHERE codigo=$1 AND empresa_codigo=$2`,
    [produto_codigo, session.empresa_codigo]
  );
  if (prodRows.length === 0) {
    return NextResponse.json({ error: 'Produto inválido.' }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO orcamento_itens (orcamento_codigo, produto_codigo, quantidade, valor_unitario, empresa_codigo)
     VALUES ($1, $2, $3, $4, $5)`,
    [codigo, produto_codigo, quantidade, valor_unitario, session.empresa_codigo]
  );

  await recalcularTotal(codigo, session.empresa_codigo);
  return NextResponse.json({ ok: true }, { status: 201 });
}
