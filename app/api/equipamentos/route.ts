import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { rows } = await pool.query(
    `SELECT codigo, fabricante, modelo, consumo_w_hora FROM equipamentos ORDER BY codigo`
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { fabricante, modelo, consumo_w_hora } = await request.json().catch(() => ({}));

  if (!fabricante || !modelo || !consumo_w_hora) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }
  if (Number.isNaN(Number(consumo_w_hora))) {
    return NextResponse.json({ error: 'Consumo inválido.' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO equipamentos (fabricante, modelo, consumo_w_hora) VALUES ($1, $2, $3)
     RETURNING codigo, fabricante, modelo, consumo_w_hora`,
    [fabricante, modelo, consumo_w_hora]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
