import { NextRequest, NextResponse } from 'next/server';
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
    `SELECT p.codigo, p.descricao, p.link_stl, p.stl_nome, (p.foto IS NOT NULL) AS tem_foto,
            p.quantidade, p.tempo_impressao_segundos, p.tempo_mao_obra_segundos,
            COALESCE(
              (SELECT json_agg(json_build_object(
                 'materia_prima_codigo', mp.codigo,
                 'nome', t.nome || ' — ' || mp.marca,
                 'cor', mp.cor,
                 'cor_hex', mp.cor_hex,
                 'peso', pm.peso,
                 'valor_custo', mp.valor_custo
               ) ORDER BY pm.codigo)
               FROM produto_materiais pm
               JOIN materia_prima mp ON mp.codigo = pm.materia_prima_codigo
               JOIN tipos_materia_prima t ON t.codigo = mp.tipo_codigo
               WHERE pm.produto_codigo = p.codigo),
              '[]'
            ) AS materiais
     FROM produtos p WHERE p.empresa_codigo = $1 ORDER BY p.codigo`,
    [session.empresa_codigo]
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa para cadastrar produtos.' }, { status: 400 });
  }

  const {
    descricao,
    link_stl,
    foto_base64,
    foto_tipo,
    quantidade,
    tempo_impressao_segundos,
    tempo_mao_obra_segundos,
  } = await request.json().catch(() => ({}));

  if (!descricao) {
    return NextResponse.json({ error: 'Informe a descrição.' }, { status: 400 });
  }

  const foto = foto_base64 ? Buffer.from(foto_base64, 'base64') : null;

  const { rows } = await pool.query(
    `INSERT INTO produtos (descricao, link_stl, foto, foto_tipo, quantidade, tempo_impressao_segundos, tempo_mao_obra_segundos, empresa_codigo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING codigo`,
    [
      descricao,
      link_stl || null,
      foto,
      foto ? foto_tipo : null,
      quantidade || 1,
      tempo_impressao_segundos || 0,
      tempo_mao_obra_segundos || 0,
      session.empresa_codigo,
    ]
  );
  return NextResponse.json({ codigo: rows[0].codigo }, { status: 201 });
}
