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
    `SELECT mp.codigo, t.nome AS tipo_nome, mp.cor, mp.cor_hex, mp.estoque_minimo,
            u.sigla AS unidade_medida_sigla,
            COALESCE(SUM(CASE WHEN me.tipo = 'ENTRADA' THEN me.quantidade ELSE -me.quantidade END), 0) AS saldo,
            COUNT(DISTINCT l.codigo) AS total_lotes,
            COALESCE((
              SELECT SUM(oim.peso * oi.quantidade)
              FROM orcamento_item_materiais oim
              JOIN orcamento_itens oi ON oi.codigo = oim.orcamento_item_codigo
              JOIN orcamentos o ON o.codigo = oi.orcamento_codigo
              WHERE oim.materia_prima_codigo = mp.codigo AND oim.baixado_em IS NULL AND o.status <> 'REJEITADO'
                    AND o.consome_estoque = true
            ), 0) AS reservado
     FROM materia_prima mp
     JOIN tipos_materia_prima t ON t.codigo = mp.tipo_codigo
     JOIN unidades_medida u ON u.codigo = mp.unidade_medida_codigo
     LEFT JOIN materia_prima_lotes l ON l.materia_prima_codigo = mp.codigo
     LEFT JOIN movimentacoes_estoque me ON me.lote_codigo = l.codigo
     WHERE mp.empresa_codigo = $1
     GROUP BY mp.codigo, t.nome, mp.cor, mp.cor_hex, mp.estoque_minimo, u.sigla
     ORDER BY mp.codigo`,
    [session.empresa_codigo]
  );
  return NextResponse.json(rows);
}
