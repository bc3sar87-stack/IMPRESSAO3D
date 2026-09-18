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
    `SELECT codigo, tipo_pessoa, documento, nome, telefone, email, endereco, observacao
     FROM clientes WHERE empresa_codigo = $1 ORDER BY nome`,
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
    return NextResponse.json({ error: 'Selecione uma empresa para cadastrar clientes.' }, { status: 400 });
  }

  const { tipo_pessoa, documento, nome, telefone, email, endereco, observacao } = await request.json().catch(() => ({}));

  if (!tipo_pessoa || !nome) {
    return NextResponse.json({ error: 'Preencha tipo e nome.' }, { status: 400 });
  }
  if (tipo_pessoa !== 'PJ' && tipo_pessoa !== 'PF') {
    return NextResponse.json({ error: 'Tipo de pessoa inválido.' }, { status: 400 });
  }
  if (documento) {
    const digitos = documento.replace(/\D/g, '');
    const esperado = tipo_pessoa === 'PJ' ? 14 : 11;
    if (digitos.length !== esperado) {
      return NextResponse.json(
        { error: tipo_pessoa === 'PJ' ? 'CNPJ inválido.' : 'CPF inválido.' },
        { status: 400 }
      );
    }
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO clientes (tipo_pessoa, documento, nome, telefone, email, endereco, observacao, empresa_codigo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING codigo`,
      [
        tipo_pessoa,
        documento || null,
        nome,
        telefone || null,
        email || null,
        endereco || null,
        observacao || null,
        session.empresa_codigo,
      ]
    );
    return NextResponse.json({ codigo: rows[0].codigo }, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      return NextResponse.json({ error: 'Já existe um cliente com esse documento.' }, { status: 409 });
    }
    throw err;
  }
}
