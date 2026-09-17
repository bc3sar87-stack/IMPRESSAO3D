import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';
import { reverterBaixaEstoqueItem } from '@/lib/estoque';

async function recalcularTotal(orcamentoCodigo: string, empresaCodigo: number) {
  await pool.query(
    `UPDATE orcamentos SET valor_total = (
       SELECT COALESCE(SUM(quantidade * valor_unitario), 0)
       FROM orcamento_itens WHERE orcamento_codigo = $1
     ) WHERE codigo = $1 AND empresa_codigo = $2`,
    [orcamentoCodigo, empresaCodigo]
  );
}

export async function PUT(
  request: NextRequest,
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
  const { valor_unitario } = await request.json().catch(() => ({}));

  if (valor_unitario === undefined || valor_unitario === null || Number(valor_unitario) < 0) {
    return NextResponse.json({ error: 'Valor unitário inválido.' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `UPDATE orcamento_itens SET valor_unitario=$1
     WHERE codigo=$2 AND orcamento_codigo=$3 AND empresa_codigo=$4
     RETURNING codigo`,
    [valor_unitario, item_codigo, codigo, session.empresa_codigo]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 });
  }

  await recalcularTotal(codigo, session.empresa_codigo);
  return NextResponse.json({ ok: true });
}

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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await reverterBaixaEstoqueItem(client, item_codigo, session.empresa_codigo);
    await client.query(
      `DELETE FROM orcamento_itens WHERE codigo=$1 AND orcamento_codigo=$2 AND empresa_codigo=$3`,
      [item_codigo, codigo, session.empresa_codigo]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await recalcularTotal(codigo, session.empresa_codigo);
  return NextResponse.json({ ok: true });
}
