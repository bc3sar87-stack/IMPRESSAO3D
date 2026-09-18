import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';

export async function GET() {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ marcas: [], fornecedores: [] });
  }

  const { rows } = await pool.query(
    `SELECT DISTINCT marca, fornecedor FROM materia_prima_lotes WHERE empresa_codigo = $1`,
    [session.empresa_codigo]
  );

  const marcas = Array.from(new Set(rows.map((r) => r.marca).filter(Boolean))).sort();
  const fornecedores = Array.from(new Set(rows.map((r) => r.fornecedor).filter(Boolean))).sort();

  return NextResponse.json({ marcas, fornecedores });
}
