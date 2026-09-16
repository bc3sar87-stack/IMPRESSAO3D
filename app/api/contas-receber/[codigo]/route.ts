import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;
  const { descricao, valor, data_vencimento, data_recebimento, status, banco_codigo } = await request
    .json()
    .catch(() => ({}));

  if (!descricao || valor === undefined || valor === '' || !data_vencimento || !status) {
    return NextResponse.json(
      { error: 'Informe descrição, valor, vencimento e status.' },
      { status: 400 }
    );
  }
  if (Number(valor) <= 0) {
    return NextResponse.json({ error: 'Valor deve ser maior que zero.' }, { status: 400 });
  }
  if (status === 'RECEBIDO' && !banco_codigo) {
    return NextResponse.json(
      { error: 'Selecione o banco em que o título será baixado.' },
      { status: 400 }
    );
  }

  if (banco_codigo) {
    const { rows: bancoRows } = await pool.query(
      `SELECT 1 FROM bancos WHERE codigo=$1 AND empresa_codigo=$2`,
      [banco_codigo, session.empresa_codigo]
    );
    if (bancoRows.length === 0) {
      return NextResponse.json({ error: 'Banco inválido.' }, { status: 400 });
    }
  }

  const { rows } = await pool.query(
    `UPDATE contas_receber
     SET descricao=$1, valor=$2, data_vencimento=$3, data_recebimento=$4, status=$5, banco_codigo=$6
     WHERE codigo=$7 AND empresa_codigo=$8
     RETURNING codigo`,
    [
      descricao,
      valor,
      data_vencimento,
      data_recebimento || null,
      status,
      banco_codigo || null,
      codigo,
      session.empresa_codigo,
    ]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 });
  }

  if (status === 'RECEBIDO') {
    await pool.query(
      `INSERT INTO movimentacoes_financeiras (tipo, descricao, valor, data_movimento, banco_codigo, origem, referencia_codigo, empresa_codigo)
       VALUES ('ENTRADA', $1, $2, $3, $4, 'CONTA_RECEBER', $5, $6)
       ON CONFLICT (origem, referencia_codigo) WHERE origem <> 'MANUAL'
       DO UPDATE SET descricao=EXCLUDED.descricao, valor=EXCLUDED.valor, data_movimento=EXCLUDED.data_movimento, banco_codigo=EXCLUDED.banco_codigo`,
      [descricao, valor, data_recebimento || data_vencimento, banco_codigo, codigo, session.empresa_codigo]
    );
  } else {
    await pool.query(
      `DELETE FROM movimentacoes_financeiras WHERE origem='CONTA_RECEBER' AND referencia_codigo=$1 AND empresa_codigo=$2`,
      [codigo, session.empresa_codigo]
    );
  }

  return NextResponse.json({ codigo: rows[0].codigo });
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
  await pool.query(
    `DELETE FROM movimentacoes_financeiras WHERE origem='CONTA_RECEBER' AND referencia_codigo=$1 AND empresa_codigo=$2`,
    [codigo, session.empresa_codigo]
  );
  await pool.query(`DELETE FROM contas_receber WHERE codigo=$1 AND empresa_codigo=$2`, [
    codigo,
    session.empresa_codigo,
  ]);
  return NextResponse.json({ ok: true });
}
