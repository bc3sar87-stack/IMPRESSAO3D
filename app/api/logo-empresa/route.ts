import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ tem_logo: false });
  }

  const { rows } = await pool.query(
    `SELECT (logo_imagem IS NOT NULL) AS tem_logo FROM empresa WHERE codigo = $1`,
    [session.empresa_codigo]
  );
  return NextResponse.json({ tem_logo: rows[0]?.tem_logo || false });
}

export async function PUT(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { logo_base64, logo_tipo, remover_logo } = await request.json().catch(() => ({}));

  if (logo_base64) {
    await pool.query(`UPDATE empresa SET logo_imagem=$1, logo_tipo=$2 WHERE codigo=$3`, [
      Buffer.from(logo_base64, 'base64'),
      logo_tipo,
      session.empresa_codigo,
    ]);
  } else if (remover_logo) {
    await pool.query(`UPDATE empresa SET logo_imagem=NULL, logo_tipo=NULL WHERE codigo=$1`, [
      session.empresa_codigo,
    ]);
  }

  return NextResponse.json({ ok: true });
}
