import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { lote_codigo, tipo, quantidade, observacao } = await request.json().catch(() => ({}));

  if (!lote_codigo || !tipo || !quantidade) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }
  if (tipo !== 'ENTRADA' && tipo !== 'SAIDA') {
    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
  }
  if (Number(quantidade) <= 0) {
    return NextResponse.json({ error: 'Quantidade deve ser maior que zero.' }, { status: 400 });
  }

  const { rows: loteRows } = await pool.query(
    `SELECT l.materia_prima_codigo,
       COALESCE(SUM(CASE WHEN me.tipo = 'ENTRADA' THEN me.quantidade ELSE -me.quantidade END), 0) AS saldo
     FROM materia_prima_lotes l
     LEFT JOIN movimentacoes_estoque me ON me.lote_codigo = l.codigo
     WHERE l.codigo = $1 AND l.empresa_codigo = $2
     GROUP BY l.codigo`,
    [lote_codigo, session.empresa_codigo]
  );

  if (loteRows.length === 0) {
    return NextResponse.json({ error: 'Lote não encontrado.' }, { status: 404 });
  }

  if (tipo === 'SAIDA' && Number(loteRows[0].saldo) < Number(quantidade)) {
    return NextResponse.json(
      { error: `Estoque insuficiente neste lote. Saldo atual: ${loteRows[0].saldo}.` },
      { status: 400 }
    );
  }

  await pool.query(
    `INSERT INTO movimentacoes_estoque (materia_prima_codigo, lote_codigo, tipo, quantidade, observacao, empresa_codigo)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [loteRows[0].materia_prima_codigo, lote_codigo, tipo, quantidade, observacao || null, session.empresa_codigo]
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
