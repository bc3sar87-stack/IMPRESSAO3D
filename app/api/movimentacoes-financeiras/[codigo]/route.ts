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

  const { rows: existentes } = await pool.query(
    `SELECT origem FROM movimentacoes_financeiras WHERE codigo=$1 AND empresa_codigo=$2`,
    [codigo, session.empresa_codigo]
  );
  if (existentes.length === 0) {
    return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 });
  }
  if (existentes[0].origem !== 'MANUAL') {
    return NextResponse.json(
      { error: 'Este lançamento foi gerado automaticamente e só pode ser alterado pela tela de origem (Contas a Receber/Pagar).' },
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
    `UPDATE movimentacoes_financeiras
     SET tipo=$1, descricao=$2, valor=$3, data_movimento=$4, banco_codigo=$5
     WHERE codigo=$6 AND empresa_codigo=$7 AND origem='MANUAL'
     RETURNING codigo`,
    [tipo, descricao, valor, data_movimento, banco_codigo || null, codigo, session.empresa_codigo]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 });
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
  const { rows: existentes } = await pool.query(
    `SELECT origem FROM movimentacoes_financeiras WHERE codigo=$1 AND empresa_codigo=$2`,
    [codigo, session.empresa_codigo]
  );
  if (existentes.length === 0) {
    return NextResponse.json({ ok: true });
  }
  if (existentes[0].origem !== 'MANUAL') {
    return NextResponse.json(
      { error: 'Este lançamento foi gerado automaticamente e só pode ser removido pela tela de origem (Contas a Receber/Pagar).' },
      { status: 400 }
    );
  }

  await pool.query(`DELETE FROM movimentacoes_financeiras WHERE codigo=$1 AND empresa_codigo=$2 AND origem='MANUAL'`, [
    codigo,
    session.empresa_codigo,
  ]);
  return NextResponse.json({ ok: true });
}
