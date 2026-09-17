import { NextResponse } from 'next/server';
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
    `SELECT mp.codigo, t.nome AS tipo_nome, mp.marca, mp.cor, mp.cor_hex,
            u.sigla AS unidade_medida_sigla,
            COALESCE(SUM(CASE WHEN me.tipo = 'ENTRADA' THEN me.quantidade ELSE -me.quantidade END), 0) AS saldo,
            COUNT(DISTINCT l.codigo) AS total_lotes
     FROM materia_prima mp
     JOIN tipos_materia_prima t ON t.codigo = mp.tipo_codigo
     JOIN unidades_medida u ON u.codigo = mp.unidade_medida_codigo
     LEFT JOIN materia_prima_lotes l ON l.materia_prima_codigo = mp.codigo
     LEFT JOIN movimentacoes_estoque me ON me.lote_codigo = l.codigo
     WHERE mp.empresa_codigo = $1
     GROUP BY mp.codigo, t.nome, mp.marca, mp.cor, mp.cor_hex, u.sigla
     ORDER BY mp.codigo`,
    [session.empresa_codigo]
  );
  return NextResponse.json(rows);
}
