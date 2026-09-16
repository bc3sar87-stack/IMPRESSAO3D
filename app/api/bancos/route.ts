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
    `SELECT codigo, codigo_banco, agencia, num_conta, descricao
     FROM bancos WHERE empresa_codigo = $1 ORDER BY codigo`,
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
    return NextResponse.json({ error: 'Selecione uma empresa para cadastrar bancos.' }, { status: 400 });
  }

  const { codigo_banco, agencia, num_conta, descricao } = await request.json().catch(() => ({}));

  if (!codigo_banco || !agencia || !num_conta) {
    return NextResponse.json(
      { error: 'Informe código do banco, agência e número da conta.' },
      { status: 400 }
    );
  }

  const { rows } = await pool.query(
    `INSERT INTO bancos (codigo_banco, agencia, num_conta, descricao, empresa_codigo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING codigo`,
    [codigo_banco, agencia, num_conta, descricao || null, session.empresa_codigo]
  );
  return NextResponse.json({ codigo: rows[0].codigo }, { status: 201 });
}
