import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';

export async function GET(_request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json([]);
  }

  const { codigo } = await params;
  const { rows } = await pool.query(
    `SELECT codigo, descricao, custo
     FROM produto_custos_fixos
     WHERE produto_codigo = $1 AND empresa_codigo = $2
     ORDER BY codigo`,
    [codigo, session.empresa_codigo]
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;
  const { descricao, custo } = await request.json().catch(() => ({}));

  if (!descricao || custo === undefined || custo === null || custo === '') {
    return NextResponse.json({ error: 'Informe a descrição e o custo.' }, { status: 400 });
  }
  if (Number.isNaN(Number(custo)) || Number(custo) < 0) {
    return NextResponse.json({ error: 'Custo inválido.' }, { status: 400 });
  }

  const { rows: produtoRows } = await pool.query(
    `SELECT 1 FROM produtos WHERE codigo=$1 AND empresa_codigo=$2`,
    [codigo, session.empresa_codigo]
  );
  if (produtoRows.length === 0) {
    return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
  }

  await pool.query(
    `INSERT INTO produto_custos_fixos (produto_codigo, descricao, custo, empresa_codigo)
     VALUES ($1, $2, $3, $4)`,
    [codigo, descricao, custo, session.empresa_codigo]
  );
  return NextResponse.json({ ok: true }, { status: 201 });
}
