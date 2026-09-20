import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, requireUsuario } from '@/lib/auth';

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export async function GET(_request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await getSession();
  if (!session || !session.empresa_codigo) {
    return new NextResponse(null, { status: 404 });
  }

  const { codigo } = await params;
  const { rows } = await pool.query(
    `SELECT stl_arquivo, stl_nome FROM produtos WHERE codigo = $1 AND empresa_codigo = $2`,
    [codigo, session.empresa_codigo]
  );

  const produto = rows[0];
  if (!produto || !produto.stl_arquivo) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(produto.stl_arquivo, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${produto.stl_nome || 'arquivo.stl'}"`,
    },
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;
  const formData = await request.formData();
  const arquivo = formData.get('arquivo');

  if (!(arquivo instanceof File)) {
    return NextResponse.json({ error: 'Envie um arquivo .stl ou .3mf.' }, { status: 400 });
  }
  const nomeArquivo = arquivo.name.toLowerCase();
  if (!nomeArquivo.endsWith('.stl') && !nomeArquivo.endsWith('.3mf')) {
    return NextResponse.json({ error: 'O arquivo deve ter extensão .stl ou .3mf.' }, { status: 400 });
  }
  if (arquivo.size > MAX_SIZE) {
    return NextResponse.json({ error: 'O arquivo deve ter no máximo 50MB.' }, { status: 400 });
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());

  const { rows } = await pool.query(
    `UPDATE produtos SET stl_arquivo=$1, stl_nome=$2 WHERE codigo=$3 AND empresa_codigo=$4 RETURNING codigo`,
    [buffer, arquivo.name, codigo, session.empresa_codigo]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireUsuario();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { codigo } = await params;
  await pool.query(
    `UPDATE produtos SET stl_arquivo=NULL, stl_nome=NULL WHERE codigo=$1 AND empresa_codigo=$2`,
    [codigo, session.empresa_codigo]
  );
  return NextResponse.json({ ok: true });
}
