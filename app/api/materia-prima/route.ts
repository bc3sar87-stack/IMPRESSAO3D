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
    `SELECT mp.codigo, mp.tipo_codigo, t.nome AS tipo_nome, mp.marca, mp.descricao, mp.cor, mp.cor_hex,
            mp.unidade_medida_codigo, u.sigla AS unidade_medida_sigla, u.nome AS unidade_medida_nome,
            mp.fornecedor, mp.valor_custo, mp.estoque_minimo
     FROM materia_prima mp
     JOIN tipos_materia_prima t ON t.codigo = mp.tipo_codigo
     JOIN unidades_medida u ON u.codigo = mp.unidade_medida_codigo
     WHERE mp.empresa_codigo = $1
     ORDER BY mp.codigo`,
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
    return NextResponse.json({ error: 'Selecione uma empresa para cadastrar matéria prima.' }, { status: 400 });
  }

  const { tipo_codigo, marca, descricao, cor, cor_hex, unidade_medida_codigo, fornecedor, valor_custo, estoque_minimo } =
    await request.json().catch(() => ({}));

  if (!tipo_codigo || !descricao || !cor || !unidade_medida_codigo) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }
  if (valor_custo !== undefined && valor_custo !== null && valor_custo !== '' && Number.isNaN(Number(valor_custo))) {
    return NextResponse.json({ error: 'Valor custo inválido.' }, { status: 400 });
  }
  if (
    estoque_minimo !== undefined &&
    estoque_minimo !== null &&
    estoque_minimo !== '' &&
    Number.isNaN(Number(estoque_minimo))
  ) {
    return NextResponse.json({ error: 'Estoque mínimo inválido.' }, { status: 400 });
  }
  if (cor_hex && !/^#[0-9a-fA-F]{6}$/.test(cor_hex)) {
    return NextResponse.json({ error: 'Cor inválida.' }, { status: 400 });
  }

  const { rows: tipoRows } = await pool.query(
    `SELECT 1 FROM tipos_materia_prima WHERE codigo=$1 AND empresa_codigo=$2`,
    [tipo_codigo, session.empresa_codigo]
  );
  if (tipoRows.length === 0) {
    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
  }

  const { rows: unidadeRows } = await pool.query(
    `SELECT 1 FROM unidades_medida WHERE codigo=$1 AND empresa_codigo=$2`,
    [unidade_medida_codigo, session.empresa_codigo]
  );
  if (unidadeRows.length === 0) {
    return NextResponse.json({ error: 'Unidade de medida inválida.' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO materia_prima (tipo_codigo, marca, descricao, cor, cor_hex, unidade_medida_codigo, fornecedor, valor_custo, estoque_minimo, empresa_codigo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING codigo`,
    [
      tipo_codigo,
      marca || null,
      descricao,
      cor,
      cor_hex || '#cccccc',
      unidade_medida_codigo,
      fornecedor || null,
      valor_custo || null,
      estoque_minimo || null,
      session.empresa_codigo,
    ]
  );
  return NextResponse.json({ codigo: rows[0].codigo }, { status: 201 });
}
