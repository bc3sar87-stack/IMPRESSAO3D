import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;
  const {
    descricao,
    link_stl,
    foto_base64,
    foto_tipo,
    quantidade,
    tempo_impressao_segundos,
    tempo_mao_obra_segundos,
    tipo,
    valor_custo,
  } = await request.json().catch(() => ({}));

  if (!descricao) {
    return NextResponse.json({ error: 'Informe a descrição.' }, { status: 400 });
  }

  const tipoProduto = tipo === 'REVENDA' ? 'REVENDA' : 'IMPRESSAO';
  const tempoImpressao = tipoProduto === 'IMPRESSAO' ? tempo_impressao_segundos || 0 : 0;
  const tempoMaoObra = tipoProduto === 'IMPRESSAO' ? tempo_mao_obra_segundos || 0 : 0;
  const valorCusto = tipoProduto === 'REVENDA' ? valor_custo || 0 : null;

  const { rows } = foto_base64
    ? await pool.query(
        `UPDATE produtos SET descricao=$1, link_stl=$2, foto=$3, foto_tipo=$4, quantidade=$5,
                tempo_impressao_segundos=$6, tempo_mao_obra_segundos=$7, tipo=$8, valor_custo=$9
         WHERE codigo=$10 AND empresa_codigo=$11
         RETURNING codigo`,
        [
          descricao,
          link_stl || null,
          Buffer.from(foto_base64, 'base64'),
          foto_tipo,
          quantidade || 1,
          tempoImpressao,
          tempoMaoObra,
          tipoProduto,
          valorCusto,
          codigo,
          session.empresa_codigo,
        ]
      )
    : await pool.query(
        `UPDATE produtos SET descricao=$1, link_stl=$2, quantidade=$3,
                tempo_impressao_segundos=$4, tempo_mao_obra_segundos=$5, tipo=$6, valor_custo=$7
         WHERE codigo=$8 AND empresa_codigo=$9
         RETURNING codigo`,
        [
          descricao,
          link_stl || null,
          quantidade || 1,
          tempoImpressao,
          tempoMaoObra,
          tipoProduto,
          valorCusto,
          codigo,
          session.empresa_codigo,
        ]
      );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
  }
  return NextResponse.json({ codigo: rows[0].codigo });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;
  await pool.query(`DELETE FROM produtos WHERE codigo=$1 AND empresa_codigo=$2`, [
    codigo,
    session.empresa_codigo,
  ]);
  return NextResponse.json({ ok: true });
}
