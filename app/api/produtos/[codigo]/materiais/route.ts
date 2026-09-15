import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(_request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json([]);
  }

  const { codigo } = await params;
  const { rows } = await pool.query(
    `SELECT pm.codigo, pm.materia_prima_codigo, t.nome AS tipo_nome, mp.marca, mp.cor,
            u.sigla AS unidade_medida_sigla, pm.peso
     FROM produto_materiais pm
     JOIN materia_prima mp ON mp.codigo = pm.materia_prima_codigo
     JOIN tipos_materia_prima t ON t.codigo = mp.tipo_codigo
     JOIN unidades_medida u ON u.codigo = mp.unidade_medida_codigo
     WHERE pm.produto_codigo = $1 AND pm.empresa_codigo = $2
     ORDER BY pm.codigo`,
    [codigo, session.empresa_codigo]
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;
  const { materia_prima_codigo, peso } = await request.json().catch(() => ({}));

  if (!materia_prima_codigo || !peso) {
    return NextResponse.json({ error: 'Selecione a matéria prima e informe o peso.' }, { status: 400 });
  }
  if (Number(peso) <= 0) {
    return NextResponse.json({ error: 'Peso deve ser maior que zero.' }, { status: 400 });
  }

  const { rows: produtoRows } = await pool.query(
    `SELECT 1 FROM produtos WHERE codigo=$1 AND empresa_codigo=$2`,
    [codigo, session.empresa_codigo]
  );
  if (produtoRows.length === 0) {
    return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
  }

  const { rows: mpRows } = await pool.query(
    `SELECT 1 FROM materia_prima WHERE codigo=$1 AND empresa_codigo=$2`,
    [materia_prima_codigo, session.empresa_codigo]
  );
  if (mpRows.length === 0) {
    return NextResponse.json({ error: 'Matéria prima inválida.' }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO produto_materiais (produto_codigo, materia_prima_codigo, peso, empresa_codigo)
     VALUES ($1, $2, $3, $4)`,
    [codigo, materia_prima_codigo, peso, session.empresa_codigo]
  );
  return NextResponse.json({ ok: true }, { status: 201 });
}
