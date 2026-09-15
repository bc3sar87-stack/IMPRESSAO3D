import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { codigo } = await params;
  const { documento, razao_social, tipo_pessoa } = await request.json().catch(() => ({}));

  if (!documento || !razao_social || !tipo_pessoa) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }
  if (tipo_pessoa !== 'PJ' && tipo_pessoa !== 'PF') {
    return NextResponse.json({ error: 'Tipo de pessoa inválido.' }, { status: 400 });
  }
  const digitos = documento.replace(/\D/g, '');
  const esperado = tipo_pessoa === 'PJ' ? 14 : 11;
  if (digitos.length !== esperado) {
    return NextResponse.json(
      { error: tipo_pessoa === 'PJ' ? 'CNPJ inválido.' : 'CPF inválido.' },
      { status: 400 }
    );
  }

  try {
    const { rows } = await pool.query(
      `UPDATE empresa SET documento=$1, razao_social=$2, tipo_pessoa=$3 WHERE codigo=$4
       RETURNING codigo, documento, razao_social, tipo_pessoa`,
      [documento, razao_social, tipo_pessoa, codigo]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      return NextResponse.json({ error: 'CNPJ/CPF já cadastrado.' }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { codigo } = await params;
  await pool.query(`DELETE FROM empresa WHERE codigo=$1`, [codigo]);
  return NextResponse.json({ ok: true });
}
