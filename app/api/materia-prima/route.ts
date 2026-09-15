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
    `SELECT codigo, tipo, marca, descricao, cor
     FROM materia_prima WHERE empresa_codigo = $1 ORDER BY codigo`,
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

  const { tipo, marca, descricao, cor } = await request.json().catch(() => ({}));

  if (!tipo || !marca || !descricao || !cor) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO materia_prima (tipo, marca, descricao, cor, empresa_codigo) VALUES ($1, $2, $3, $4, $5)
     RETURNING codigo, tipo, marca, descricao, cor`,
    [tipo, marca, descricao, cor, session.empresa_codigo]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
