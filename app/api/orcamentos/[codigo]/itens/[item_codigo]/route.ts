import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';
import { aplicarBaixaEstoqueOrcamento, reverterBaixaEstoqueItem } from '@/lib/estoque';

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
  const { valor_unitario, quantidade } = await request.json().catch(() => ({}));

  const temValor = valor_unitario !== undefined && valor_unitario !== null && valor_unitario !== '';
  const temQuantidade = quantidade !== undefined && quantidade !== null && quantidade !== '';

  if (!temValor && !temQuantidade) {
    return NextResponse.json({ error: 'Informe quantidade e/ou valor unitário.' }, { status: 400 });
  }
  if (temValor && (Number.isNaN(Number(valor_unitario)) || Number(valor_unitario) < 0)) {
    return NextResponse.json({ error: 'Valor unitário inválido.' }, { status: 400 });
  }
  if (temQuantidade && (Number.isNaN(Number(quantidade)) || Number(quantidade) <= 0)) {
    return NextResponse.json({ error: 'Quantidade deve ser maior que zero.' }, { status: 400 });
  }

  const { rows: atualRows } = await pool.query(
    `SELECT oi.quantidade, o.status, o.consome_estoque
     FROM orcamento_itens oi
     JOIN orcamentos o ON o.codigo = oi.orcamento_codigo
     WHERE oi.codigo=$1 AND oi.orcamento_codigo=$2 AND oi.empresa_codigo=$3`,
    [item_codigo, codigo, session.empresa_codigo]
  );
  if (atualRows.length === 0) {
    return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 });
  }
  const atual = atualRows[0];
  const quantidadeMudou = temQuantidade && Number(quantidade) !== Number(atual.quantidade);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (quantidadeMudou) {
      // A baixa/reserva depende da quantidade: estorna a baixa atual do item antes de alterar.
      await reverterBaixaEstoqueItem(client, item_codigo, session.empresa_codigo);
      await client.query(`UPDATE orcamento_item_materiais SET baixado_em = NULL WHERE orcamento_item_codigo = $1`, [
        item_codigo,
      ]);
    }
    await client.query(
      `UPDATE orcamento_itens
       SET valor_unitario = COALESCE($1, valor_unitario), quantidade = COALESCE($2, quantidade)
       WHERE codigo=$3 AND orcamento_codigo=$4 AND empresa_codigo=$5`,
      [temValor ? valor_unitario : null, temQuantidade ? quantidade : null, item_codigo, codigo, session.empresa_codigo]
    );
    if (quantidadeMudou && atual.status === 'FINALIZADO' && atual.consome_estoque !== false) {
      await aplicarBaixaEstoqueOrcamento(client, codigo, session.empresa_codigo);
    }
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
