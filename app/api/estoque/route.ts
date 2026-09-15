import { NextResponse } from 'next/server';
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
    `SELECT mp.codigo, t.nome AS tipo_nome, mp.marca, mp.cor,
            COALESCE(SUM(CASE WHEN me.tipo = 'ENTRADA' THEN me.quantidade ELSE -me.quantidade END), 0) AS saldo
     FROM materia_prima mp
     JOIN tipos_materia_prima t ON t.codigo = mp.tipo_codigo
     LEFT JOIN movimentacoes_estoque me ON me.materia_prima_codigo = mp.codigo
     WHERE mp.empresa_codigo = $1
     GROUP BY mp.codigo, t.nome, mp.marca, mp.cor
     ORDER BY mp.codigo`,
    [session.empresa_codigo]
  );
  return NextResponse.json(rows);
}
