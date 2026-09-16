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
    `SELECT m.codigo, m.tipo, m.descricao, m.valor, m.data_movimento, m.origem, m.referencia_codigo,
            m.banco_codigo, b.codigo_banco, b.agencia, b.num_conta, b.descricao AS banco_descricao
     FROM movimentacoes_financeiras m
     LEFT JOIN bancos b ON b.codigo = m.banco_codigo
     WHERE m.empresa_codigo = $1
     ORDER BY m.data_movimento DESC, m.codigo DESC`,
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
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { tipo, descricao, valor, data_movimento, banco_codigo } = await request.json().catch(() => ({}));

  if (!tipo || !['ENTRADA', 'SAIDA'].includes(tipo)) {
    return NextResponse.json({ error: 'Informe o tipo (Entrada ou Saída).' }, { status: 400 });
  }
  if (!descricao || valor === undefined || valor === '' || !data_movimento) {
    return NextResponse.json(
      { error: 'Informe descrição, valor e data do movimento.' },
      { status: 400 }
    );
  }
  if (Number(valor) <= 0) {
    return NextResponse.json({ error: 'Valor deve ser maior que zero.' }, { status: 400 });
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
    `INSERT INTO movimentacoes_financeiras (tipo, descricao, valor, data_movimento, banco_codigo, origem, empresa_codigo)
     VALUES ($1, $2, $3, $4, $5, 'MANUAL', $6)
     RETURNING codigo`,
    [tipo, descricao, valor, data_movimento, banco_codigo || null, session.empresa_codigo]
  );
  return NextResponse.json({ codigo: rows[0].codigo }, { status: 201 });
}
