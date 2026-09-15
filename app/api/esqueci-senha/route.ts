import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { enviarLinkRedefinicaoSenha } from '@/lib/mailer';

export async function POST(request: NextRequest) {
  const { email } = await request.json().catch(() => ({}));

  if (!email) {
    return NextResponse.json({ error: 'Informe seu e-mail.' }, { status: 400 });
  }

  const { rows } = await pool.query(`SELECT codigo, nome FROM usuarios WHERE email = $1`, [email]);

  if (rows.length > 0) {
    try {
      await enviarLinkRedefinicaoSenha(rows[0].codigo, rows[0].nome, email);
    } catch {
      // não expõe falhas de envio nessa rota pública (evita indicar se o e-mail existe ou não)
    }
  }

  // resposta sempre igual, exista ou não o e-mail, para não expor quais contas existem
  return NextResponse.json({ ok: true });
}
