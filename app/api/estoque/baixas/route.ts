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
    `SELECT me.codigo, me.tipo, me.quantidade, me.criado_em, me.orcamento_codigo,
            o.status AS orcamento_status, c.nome AS cliente_nome,
            mp.codigo AS materia_prima_codigo, t.nome AS tipo_nome, mp.cor, mp.cor_hex,
            me.lote_codigo, l.marca AS lote_marca, l.fornecedor AS lote_fornecedor,
            u.sigla AS unidade_medida_sigla
     FROM movimentacoes_estoque me
     JOIN materia_prima mp ON mp.codigo = me.materia_prima_codigo
     JOIN tipos_materia_prima t ON t.codigo = mp.tipo_codigo
     JOIN unidades_medida u ON u.codigo = mp.unidade_medida_codigo
     LEFT JOIN materia_prima_lotes l ON l.codigo = me.lote_codigo
     LEFT JOIN orcamentos o ON o.codigo = me.orcamento_codigo
     LEFT JOIN clientes c ON c.codigo = o.cliente_codigo
     WHERE me.orcamento_codigo IS NOT NULL AND me.empresa_codigo = $1
     ORDER BY me.criado_em DESC, me.codigo DESC`,
    [session.empresa_codigo]
  );
  return NextResponse.json(rows);
}
