import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireUsuario } from '@/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ codigo: string; item_codigo: string }> }
) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json([]);
  }

  const { item_codigo } = await params;
  const { rows } = await pool.query(
    `SELECT oim.codigo, mp.codigo AS materia_prima_codigo, t.nome AS tipo_nome, mp.marca, mp.cor, mp.cor_hex,
            oim.peso, u.sigla AS unidade_medida_sigla, oim.lote_codigo, l.fornecedor AS lote_fornecedor
     FROM orcamento_item_materiais oim
     JOIN materia_prima mp ON mp.codigo = oim.materia_prima_codigo
     JOIN tipos_materia_prima t ON t.codigo = mp.tipo_codigo
     JOIN unidades_medida u ON u.codigo = mp.unidade_medida_codigo
     LEFT JOIN materia_prima_lotes l ON l.codigo = oim.lote_codigo
     WHERE oim.orcamento_item_codigo = $1 AND oim.empresa_codigo = $2
     ORDER BY oim.codigo`,
    [item_codigo, session.empresa_codigo]
  );
  return NextResponse.json(rows);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ codigo: string; item_codigo: string }> }
) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo, item_codigo } = await params;
  const { materiais } = await request.json().catch(() => ({}));

  if (!Array.isArray(materiais)) {
    return NextResponse.json({ error: 'Lista de materiais inválida.' }, { status: 400 });
  }

  const { rows: itemRows } = await pool.query(
    `SELECT 1 FROM orcamento_itens WHERE codigo=$1 AND orcamento_codigo=$2 AND empresa_codigo=$3`,
    [item_codigo, codigo, session.empresa_codigo]
  );
  if (itemRows.length === 0) {
    return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 });
  }

  for (const m of materiais) {
    if (!m || !m.materia_prima_codigo || !m.peso || Number(m.peso) <= 0) {
      return NextResponse.json({ error: 'Informe matéria prima e peso válidos para todos os materiais.' }, { status: 400 });
    }
    const { rows: mpRows } = await pool.query(
      `SELECT 1 FROM materia_prima WHERE codigo=$1 AND empresa_codigo=$2`,
      [m.materia_prima_codigo, session.empresa_codigo]
    );
    if (mpRows.length === 0) {
      return NextResponse.json({ error: 'Matéria prima inválida.' }, { status: 400 });
    }
    if (m.lote_codigo) {
      const { rows: loteRows } = await pool.query(
        `SELECT 1 FROM materia_prima_lotes WHERE codigo=$1 AND materia_prima_codigo=$2 AND empresa_codigo=$3`,
        [m.lote_codigo, m.materia_prima_codigo, session.empresa_codigo]
      );
      if (loteRows.length === 0) {
        return NextResponse.json({ error: 'Lote inválido para a matéria prima selecionada.' }, { status: 400 });
      }
    }
  }

  await pool.query(`DELETE FROM orcamento_item_materiais WHERE orcamento_item_codigo = $1`, [item_codigo]);
  for (const m of materiais) {
    await pool.query(
      `INSERT INTO orcamento_item_materiais (orcamento_item_codigo, materia_prima_codigo, peso, lote_codigo, empresa_codigo)
       VALUES ($1, $2, $3, $4, $5)`,
      [item_codigo, m.materia_prima_codigo, m.peso, m.lote_codigo || null, session.empresa_codigo]
    );
  }

  return NextResponse.json({ ok: true });
}
