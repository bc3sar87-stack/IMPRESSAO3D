import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { materia_prima_codigo, tipo, quantidade, observacao } = await request.json().catch(() => ({}));

  if (!materia_prima_codigo || !tipo || !quantidade) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }
  if (tipo !== 'ENTRADA' && tipo !== 'SAIDA') {
    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
  }
  if (Number(quantidade) <= 0) {
    return NextResponse.json({ error: 'Quantidade deve ser maior que zero.' }, { status: 400 });
  }

  const { rows: mpRows } = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN me.tipo = 'ENTRADA' THEN me.quantidade ELSE -me.quantidade END), 0) AS saldo
     FROM materia_prima mp
     LEFT JOIN movimentacoes_estoque me ON me.materia_prima_codigo = mp.codigo
     WHERE mp.codigo = $1 AND mp.empresa_codigo = $2
     GROUP BY mp.codigo`,
    [materia_prima_codigo, session.empresa_codigo]
  );

  if (mpRows.length === 0) {
    return NextResponse.json({ error: 'Matéria prima não encontrada.' }, { status: 404 });
  }

  if (tipo === 'SAIDA' && Number(mpRows[0].saldo) < Number(quantidade)) {
    return NextResponse.json(
      { error: `Estoque insuficiente. Saldo atual: ${mpRows[0].saldo}.` },
      { status: 400 }
    );
  }

  await pool.query(
    `INSERT INTO movimentacoes_estoque (materia_prima_codigo, tipo, quantidade, observacao, empresa_codigo)
     VALUES ($1, $2, $3, $4, $5)`,
    [materia_prima_codigo, tipo, quantidade, observacao || null, session.empresa_codigo]
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
