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
    `SELECT mp.codigo, mp.tipo_codigo, t.nome AS tipo_nome, mp.marca, mp.descricao, mp.cor
     FROM materia_prima mp
     JOIN tipos_materia_prima t ON t.codigo = mp.tipo_codigo
     WHERE mp.empresa_codigo = $1
     ORDER BY mp.codigo`,
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
    return NextResponse.json({ error: 'Selecione uma empresa para cadastrar matéria prima.' }, { status: 400 });
  }

  const { tipo_codigo, marca, descricao, cor } = await request.json().catch(() => ({}));

  if (!tipo_codigo || !marca || !descricao || !cor) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }

  const { rows: tipoRows } = await pool.query(
    `SELECT 1 FROM tipos_materia_prima WHERE codigo=$1 AND empresa_codigo=$2`,
    [tipo_codigo, session.empresa_codigo]
  );
  if (tipoRows.length === 0) {
    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO materia_prima (tipo_codigo, marca, descricao, cor, empresa_codigo) VALUES ($1, $2, $3, $4, $5)
     RETURNING codigo`,
    [tipo_codigo, marca, descricao, cor, session.empresa_codigo]
  );
  return NextResponse.json({ codigo: rows[0].codigo }, { status: 201 });
}
