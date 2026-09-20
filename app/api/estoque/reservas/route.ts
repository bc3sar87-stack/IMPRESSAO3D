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
    `SELECT o.codigo AS orcamento_codigo, o.status AS orcamento_status, o.data,
            c.nome AS cliente_nome,
            mp.codigo AS materia_prima_codigo, t.nome AS tipo_nome, mp.cor, mp.cor_hex,
            oim.lote_codigo, l.marca AS lote_marca, l.fornecedor AS lote_fornecedor,
            u.sigla AS unidade_medida_sigla,
            SUM(oim.peso * oi.quantidade) AS peso_reservado
     FROM orcamento_item_materiais oim
     JOIN orcamento_itens oi ON oi.codigo = oim.orcamento_item_codigo
     JOIN orcamentos o ON o.codigo = oi.orcamento_codigo
     JOIN clientes c ON c.codigo = o.cliente_codigo
     JOIN materia_prima mp ON mp.codigo = oim.materia_prima_codigo
     JOIN tipos_materia_prima t ON t.codigo = mp.tipo_codigo
     JOIN unidades_medida u ON u.codigo = mp.unidade_medida_codigo
     LEFT JOIN materia_prima_lotes l ON l.codigo = oim.lote_codigo
     WHERE oim.baixado_em IS NULL AND o.status <> 'REJEITADO' AND o.consome_estoque = true
       AND o.empresa_codigo = $1
     GROUP BY o.codigo, o.status, o.data, c.nome, mp.codigo, t.nome, mp.cor, mp.cor_hex,
              oim.lote_codigo, l.marca, l.fornecedor, u.sigla
     ORDER BY o.codigo DESC`,
    [session.empresa_codigo]
  );
  return NextResponse.json(rows);
}
