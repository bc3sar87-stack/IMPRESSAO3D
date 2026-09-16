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
    `SELECT cp.codigo, cp.fornecedor, cp.descricao, cp.valor, cp.data_vencimento, cp.data_pagamento, cp.status,
            cp.banco_codigo, b.codigo_banco, b.agencia, b.num_conta, b.descricao AS banco_descricao
     FROM contas_pagar cp
     LEFT JOIN bancos b ON b.codigo = cp.banco_codigo
     WHERE cp.empresa_codigo = $1
     ORDER BY cp.data_vencimento, cp.codigo`,
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
    return NextResponse.json({ error: 'Selecione uma empresa.' }, { status: 400 });
  }

  const { fornecedor, descricao, valor, data_vencimento, parcelas } = await request
    .json()
    .catch(() => ({}));

  if (!descricao) {
    return NextResponse.json({ error: 'Informe a descrição.' }, { status: 400 });
  }

  if (Array.isArray(parcelas) && parcelas.length > 0) {
    for (const p of parcelas) {
      if (!p || p.valor === undefined || p.valor === '' || !p.data_vencimento) {
        return NextResponse.json(
          { error: 'Informe valor e vencimento de todas as parcelas.' },
          { status: 400 }
        );
      }
      if (Number(p.valor) <= 0) {
        return NextResponse.json(
          { error: 'O valor de cada parcela deve ser maior que zero.' },
          { status: 400 }
        );
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const codigos: number[] = [];
      const total = parcelas.length;
      for (let i = 0; i < total; i++) {
        const p = parcelas[i];
        const descricaoParcela = total > 1 ? `${descricao} (Parcela ${i + 1}/${total})` : descricao;
        const { rows } = await client.query(
          `INSERT INTO contas_pagar (fornecedor, descricao, valor, data_vencimento, empresa_codigo)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING codigo`,
          [fornecedor || null, descricaoParcela, p.valor, p.data_vencimento, session.empresa_codigo]
        );
        codigos.push(rows[0].codigo);
      }
      await client.query('COMMIT');
      return NextResponse.json({ codigos }, { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  if (valor === undefined || valor === '' || !data_vencimento) {
    return NextResponse.json(
      { error: 'Informe descrição, valor e data de vencimento.' },
      { status: 400 }
    );
  }
  if (Number(valor) <= 0) {
    return NextResponse.json({ error: 'Valor deve ser maior que zero.' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO contas_pagar (fornecedor, descricao, valor, data_vencimento, empresa_codigo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING codigo`,
    [fornecedor || null, descricao, valor, data_vencimento, session.empresa_codigo]
  );
  return NextResponse.json({ codigo: rows[0].codigo }, { status: 201 });
}
