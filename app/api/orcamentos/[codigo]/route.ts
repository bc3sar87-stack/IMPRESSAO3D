import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';
import { aplicarBaixaEstoqueOrcamento, reverterBaixaEstoqueOrcamento } from '@/lib/estoque';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;
  const { rows } = await pool.query(
    `SELECT o.codigo, o.data, o.data_entrega, o.status, o.observacoes, o.valor_total, o.valor_sugerido, o.custo_total,
            o.markup_percentual, o.impostos_percentual, o.taxa_marketplace, o.taxa_percentual,
            o.embalagem_valor, o.custos_extras_valor,
            c.codigo AS cliente_codigo, c.nome AS cliente_nome, c.documento AS cliente_documento,
            c.tipo_pessoa AS cliente_tipo_pessoa, c.telefone AS cliente_telefone, c.email AS cliente_email,
            c.endereco AS cliente_endereco,
            e.razao_social AS empresa_razao_social, e.documento AS empresa_documento, e.tipo_pessoa AS empresa_tipo_pessoa,
            eq.fabricante AS equipamento_fabricante, eq.modelo AS equipamento_modelo
     FROM orcamentos o
     JOIN clientes c ON c.codigo = o.cliente_codigo
     JOIN empresa e ON e.codigo = o.empresa_codigo
     LEFT JOIN equipamentos eq ON eq.codigo = o.equipamento_codigo
     WHERE o.codigo = $1 AND o.empresa_codigo = $2`,
    [codigo, session.empresa_codigo]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;
  const {
    cliente_codigo,
    data,
    data_entrega,
    status,
    observacoes,
    equipamento_codigo,
    markup_percentual,
    impostos_percentual,
    taxa_marketplace,
    taxa_percentual,
    embalagem_valor,
    custos_extras_valor,
    valor_sugerido,
    custo_total,
  } = await request.json().catch(() => ({}));

  if (!cliente_codigo || !data || !status) {
    return NextResponse.json({ error: 'Preencha cliente, data e status.' }, { status: 400 });
  }

  const { rows: clienteRows } = await pool.query(
    `SELECT 1 FROM clientes WHERE codigo=$1 AND empresa_codigo=$2`,
    [cliente_codigo, session.empresa_codigo]
  );
  if (clienteRows.length === 0) {
    return NextResponse.json({ error: 'Cliente inválido.' }, { status: 400 });
  }

  if (equipamento_codigo) {
    const { rows: eqRows } = await pool.query(
      `SELECT 1 FROM equipamentos WHERE codigo=$1 AND empresa_codigo=$2`,
      [equipamento_codigo, session.empresa_codigo]
    );
    if (eqRows.length === 0) {
      return NextResponse.json({ error: 'Equipamento inválido.' }, { status: 400 });
    }
  }

  const { rows: atualRows } = await pool.query(
    `SELECT status FROM orcamentos WHERE codigo=$1 AND empresa_codigo=$2`,
    [codigo, session.empresa_codigo]
  );
  if (atualRows.length === 0) {
    return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 });
  }
  const statusAnterior = atualRows[0].status;

  if (status !== statusAnterior) {
    const { rows: itensRows } = await pool.query(
      `SELECT 1 FROM orcamento_itens WHERE orcamento_codigo=$1 AND empresa_codigo=$2 LIMIT 1`,
      [codigo, session.empresa_codigo]
    );
    if (itensRows.length === 0) {
      return NextResponse.json(
        { error: 'Adicione ao menos um item ao orçamento antes de alterar o status.' },
        { status: 400 }
      );
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE orcamentos SET cliente_codigo=$1, data=$2, data_entrega=$3, status=$4, observacoes=$5,
              equipamento_codigo=$6, markup_percentual=$7, impostos_percentual=$8, taxa_marketplace=$9,
              taxa_percentual=$10, embalagem_valor=$11, custos_extras_valor=$12,
              valor_sugerido=COALESCE($13, valor_sugerido), custo_total=COALESCE($14, custo_total)
       WHERE codigo=$15 AND empresa_codigo=$16
       RETURNING codigo`,
      [
        cliente_codigo,
        data,
        data_entrega || null,
        status,
        observacoes || null,
        equipamento_codigo || null,
        markup_percentual || 0,
        impostos_percentual || 0,
        taxa_marketplace || 'MANUAL',
        taxa_percentual || 0,
        embalagem_valor || 0,
        custos_extras_valor || 0,
        valor_sugerido || null,
        custo_total || null,
        codigo,
        session.empresa_codigo,
      ]
    );

    if (statusAnterior !== 'FINALIZADO' && status === 'FINALIZADO') {
      await aplicarBaixaEstoqueOrcamento(client, codigo, session.empresa_codigo);
    } else if (statusAnterior === 'FINALIZADO' && status !== 'FINALIZADO') {
      await reverterBaixaEstoqueOrcamento(client, codigo, session.empresa_codigo);
    }

    await client.query('COMMIT');
    return NextResponse.json({ codigo: rows[0].codigo });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await reverterBaixaEstoqueOrcamento(client, codigo, session.empresa_codigo);
    await client.query(`DELETE FROM orcamentos WHERE codigo=$1 AND empresa_codigo=$2`, [
      codigo,
      session.empresa_codigo,
    ]);
    await client.query('COMMIT');
    return NextResponse.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
