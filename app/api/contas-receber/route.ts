import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';

export async function GET() {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json([]);
  }

  const { rows } = await pool.query(
    `SELECT cr.codigo, cr.orcamento_codigo, cr.cliente_codigo, c.nome AS cliente_nome,
            cr.descricao, cr.valor, cr.data_vencimento, cr.data_recebimento, cr.status,
            cr.banco_codigo, b.codigo_banco, b.agencia, b.num_conta, b.descricao AS banco_descricao
     FROM contas_receber cr
     LEFT JOIN clientes c ON c.codigo = cr.cliente_codigo
     LEFT JOIN bancos b ON b.codigo = cr.banco_codigo
     WHERE cr.empresa_codigo = $1
     ORDER BY cr.data_vencimento, cr.codigo`,
    [session.empresa_codigo]
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { orcamento_codigo, cliente_codigo, descricao, valor, data_vencimento, data_recebimento } = await request
    .json()
    .catch(() => ({}));

  if (!descricao || valor === undefined || valor === '' || !data_vencimento) {
    return NextResponse.json(
      { error: 'Informe descrição, valor e data de vencimento.' },
      { status: 400 }
    );
  }
  if (Number(valor) <= 0) {
    return NextResponse.json({ error: 'Valor deve ser maior que zero.' }, { status: 400 });
  }

  if (cliente_codigo) {
    const { rows } = await pool.query(
      `SELECT 1 FROM clientes WHERE codigo=$1 AND empresa_codigo=$2`,
      [cliente_codigo, session.empresa_codigo]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Cliente inválido.' }, { status: 400 });
    }
  }
  if (orcamento_codigo) {
    const { rows } = await pool.query(
      `SELECT 1 FROM orcamentos WHERE codigo=$1 AND empresa_codigo=$2`,
      [orcamento_codigo, session.empresa_codigo]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Orçamento inválido.' }, { status: 400 });
    }
  }

  const { rows } = await pool.query(
    `INSERT INTO contas_receber (orcamento_codigo, cliente_codigo, descricao, valor, data_vencimento, data_recebimento, empresa_codigo)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING codigo`,
    [
      orcamento_codigo || null,
      cliente_codigo || null,
      descricao,
      valor,
      data_vencimento,
      data_recebimento || null,
      session.empresa_codigo,
    ]
  );
  return NextResponse.json({ codigo: rows[0].codigo }, { status: 201 });
}
