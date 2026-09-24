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
    `SELECT codigo, fabricante, modelo, consumo_w_hora, valor_aquisicao, vida_util_horas
     FROM equipamentos WHERE empresa_codigo = $1 ORDER BY codigo`,
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
    return NextResponse.json({ error: 'Selecione uma empresa para cadastrar equipamentos.' }, { status: 400 });
  }

  const { fabricante, modelo, consumo_w_hora, valor_aquisicao, vida_util_horas } = await request
    .json()
    .catch(() => ({}));

  if (!fabricante || !modelo || !consumo_w_hora) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }
  if (Number.isNaN(Number(consumo_w_hora))) {
    return NextResponse.json({ error: 'Consumo inválido.' }, { status: 400 });
  }
  if (
    (valor_aquisicao && (Number.isNaN(Number(valor_aquisicao)) || Number(valor_aquisicao) < 0)) ||
    (vida_util_horas && (Number.isNaN(Number(vida_util_horas)) || Number(vida_util_horas) < 0))
  ) {
    return NextResponse.json({ error: 'Valor de aquisição ou vida útil inválidos.' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO equipamentos (fabricante, modelo, consumo_w_hora, valor_aquisicao, vida_util_horas, empresa_codigo)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING codigo, fabricante, modelo, consumo_w_hora, valor_aquisicao, vida_util_horas`,
    [fabricante, modelo, consumo_w_hora, valor_aquisicao || null, vida_util_horas || null, session.empresa_codigo]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
