import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ materia_prima_codigo: string }> }
) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json([]);
  }

  const { materia_prima_codigo } = await params;

  const { rows } = await pool.query(
    `SELECT l.codigo, l.marca, l.fornecedor, l.valor_custo, l.data_compra, l.observacao, l.criado_em,
            l.temp_mesa_min, l.temp_mesa_max, l.temp_impressao_min, l.temp_impressao_max,
            COALESCE(SUM(CASE WHEN me.tipo = 'ENTRADA' THEN me.quantidade ELSE -me.quantidade END), 0) AS saldo,
            COALESCE((
              SELECT SUM(oim.peso * oi.quantidade)
              FROM orcamento_item_materiais oim
              JOIN orcamento_itens oi ON oi.codigo = oim.orcamento_item_codigo
              JOIN orcamentos o ON o.codigo = oi.orcamento_codigo
              WHERE oim.lote_codigo = l.codigo AND oim.baixado_em IS NULL AND o.status <> 'REJEITADO'
            ), 0) AS reservado
     FROM materia_prima_lotes l
     LEFT JOIN movimentacoes_estoque me ON me.lote_codigo = l.codigo
     WHERE l.materia_prima_codigo = $1 AND l.empresa_codigo = $2
     GROUP BY l.codigo
     ORDER BY l.data_compra NULLS LAST, l.codigo`,
    [materia_prima_codigo, session.empresa_codigo]
  );
  return NextResponse.json(rows);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ materia_prima_codigo: string }> }
) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { materia_prima_codigo } = await params;
  const {
    marca,
    fornecedor,
    valor_custo,
    quantidade_inicial,
    data_compra,
    observacao,
    temp_mesa_min,
    temp_mesa_max,
    temp_impressao_min,
    temp_impressao_max,
  } = await request.json().catch(() => ({}));

  if (!quantidade_inicial || Number(quantidade_inicial) <= 0) {
    return NextResponse.json({ error: 'Informe a quantidade inicial do lote.' }, { status: 400 });
  }
  if (valor_custo !== undefined && valor_custo !== null && valor_custo !== '' && Number.isNaN(Number(valor_custo))) {
    return NextResponse.json({ error: 'Custo inválido.' }, { status: 400 });
  }
  const temperaturas = { temp_mesa_min, temp_mesa_max, temp_impressao_min, temp_impressao_max };
  for (const [campo, valor] of Object.entries(temperaturas)) {
    if (valor !== undefined && valor !== null && valor !== '' && Number.isNaN(Number(valor))) {
      return NextResponse.json({ error: `Temperatura inválida em "${campo}".` }, { status: 400 });
    }
  }

  const { rows: mpRows } = await pool.query(
    `SELECT 1 FROM materia_prima WHERE codigo=$1 AND empresa_codigo=$2`,
    [materia_prima_codigo, session.empresa_codigo]
  );
  if (mpRows.length === 0) {
    return NextResponse.json({ error: 'Matéria prima (cor) não encontrada.' }, { status: 404 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: loteRows } = await client.query(
      `INSERT INTO materia_prima_lotes (
         materia_prima_codigo, marca, fornecedor, valor_custo, data_compra, observacao,
         temp_mesa_min, temp_mesa_max, temp_impressao_min, temp_impressao_max, empresa_codigo
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING codigo`,
      [
        materia_prima_codigo,
        marca || null,
        fornecedor || null,
        valor_custo || null,
        data_compra || null,
        observacao || null,
        temp_mesa_min || null,
        temp_mesa_max || null,
        temp_impressao_min || null,
        temp_impressao_max || null,
        session.empresa_codigo,
      ]
    );
    const loteCodigo = loteRows[0].codigo;
    await client.query(
      `INSERT INTO movimentacoes_estoque (materia_prima_codigo, lote_codigo, tipo, quantidade, observacao, empresa_codigo)
       VALUES ($1, $2, 'ENTRADA', $3, 'Entrada inicial do lote', $4)`,
      [materia_prima_codigo, loteCodigo, quantidade_inicial, session.empresa_codigo]
    );
    await client.query('COMMIT');
    return NextResponse.json({ codigo: loteCodigo }, { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
