import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { rows } = await pool.query(
    `SELECT codigo, documento, razao_social, tipo_pessoa FROM empresa ORDER BY codigo`
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

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
      `INSERT INTO empresa (documento, razao_social, tipo_pessoa) VALUES ($1, $2, $3)
       RETURNING codigo, documento, razao_social, tipo_pessoa`,
      [documento, razao_social, tipo_pessoa]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      return NextResponse.json({ error: 'CNPJ/CPF já cadastrado.' }, { status: 409 });
    }
    throw err;
  }
}
