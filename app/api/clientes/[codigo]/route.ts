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
      `UPDATE clientes SET tipo_pessoa=$1, documento=$2, nome=$3, telefone=$4, email=$5, endereco=$6, observacao=$7
       WHERE codigo=$8 AND empresa_codigo=$9
       RETURNING codigo`,
      [
        tipo_pessoa,
        documento || null,
        nome,
        telefone || null,
        email || null,
        endereco || null,
        observacao || null,
        codigo,
        session.empresa_codigo,
      ]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ codigo: rows[0].codigo });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      return NextResponse.json({ error: 'Já existe um cliente com esse documento.' }, { status: 409 });
    }
    throw err;
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
  await pool.query(`DELETE FROM clientes WHERE codigo=$1 AND empresa_codigo=$2`, [
    codigo,
    session.empresa_codigo,
  ]);
  return NextResponse.json({ ok: true });
}
