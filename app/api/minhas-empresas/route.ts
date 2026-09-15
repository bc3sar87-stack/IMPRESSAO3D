import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const { rows } = await pool.query(
    `SELECT e.codigo, e.cnpj, e.razao_social
     FROM empresa e
     JOIN usuarios_empresas ue ON ue.empresa_codigo = e.codigo
     WHERE ue.usuario_codigo = $1
     ORDER BY e.razao_social`,
    [session.codigo]
  );
  return NextResponse.json(rows);
}
