import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { sendSystemEmail } from '@/lib/mailer';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!session.empresa_codigo) {
    return NextResponse.json([]);
  }

  const { codigo } = await params;
  const { rows } = await pool.query(
    `SELECT codigo, destinatario, sucesso, erro_mensagem, enviado_em
     FROM orcamento_envios_log
     WHERE orcamento_codigo = $1 AND empresa_codigo = $2
     ORDER BY enviado_em DESC`,
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
  const { destinatario } = await request.json().catch(() => ({}));

  const { rows: orcRows } = await pool.query(
    `SELECT o.codigo, o.data, o.data_entrega, o.status, o.observacoes, o.valor_total,
            c.nome AS cliente_nome, c.email AS cliente_email,
            e.razao_social AS empresa_razao_social,
            eq.fabricante AS equipamento_fabricante, eq.modelo AS equipamento_modelo
     FROM orcamentos o
     JOIN clientes c ON c.codigo = o.cliente_codigo
     JOIN empresa e ON e.codigo = o.empresa_codigo
     LEFT JOIN equipamentos eq ON eq.codigo = o.equipamento_codigo
     WHERE o.codigo = $1 AND o.empresa_codigo = $2`,
    [codigo, session.empresa_codigo]
  );
  if (orcRows.length === 0) {
    return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 });
  }
  const orcamento = orcRows[0];

  const destinatarioFinal = destinatario || orcamento.cliente_email;
  if (!destinatarioFinal) {
    return NextResponse.json(
      { error: 'Informe um e-mail de destino (o cliente não possui e-mail cadastrado).' },
      { status: 400 }
    );
  }

  const { rows: itensRows } = await pool.query(
    `SELECT p.descricao AS produto_descricao, oi.quantidade, oi.valor_unitario,
            (oi.quantidade * oi.valor_unitario) AS subtotal
     FROM orcamento_itens oi
     JOIN produtos p ON p.codigo = oi.produto_codigo
     WHERE oi.orcamento_codigo = $1 AND oi.empresa_codigo = $2
     ORDER BY oi.codigo`,
    [codigo, session.empresa_codigo]
  );

  const { rows: pixRows } = await pool.query(
    `SELECT chave_pix, qrcode_imagem, qrcode_tipo FROM configuracao_pix WHERE empresa_codigo = $1`,
    [session.empresa_codigo]
  );
  const pix = pixRows[0];

  const linhasItens = itensRows
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${item.produto_descricao}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantidade}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">R$ ${Number(item.valor_unitario).toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">R$ ${Number(item.subtotal).toFixed(2)}</td>
      </tr>`
    )
    .join('');

  const dataFormatada = new Date(orcamento.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  const entregaFormatada = orcamento.data_entrega
    ? new Date(orcamento.data_entrega).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    : '-';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#1e293b;">Orçamento #${orcamento.codigo} — ${orcamento.empresa_razao_social}</h2>
      <p>Olá, ${orcamento.cliente_nome}!</p>
      <p>Segue abaixo o orçamento solicitado:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
        <tr>
          <td style="padding:4px 8px;color:#64748b;">Data</td>
          <td style="padding:4px 8px;">${dataFormatada}</td>
        </tr>
        <tr>
          <td style="padding:4px 8px;color:#64748b;">Previsão de entrega</td>
          <td style="padding:4px 8px;">${entregaFormatada}</td>
        </tr>
        ${
          orcamento.equipamento_fabricante
            ? `<tr><td style="padding:4px 8px;color:#64748b;">Equipamento</td><td style="padding:4px 8px;">${orcamento.equipamento_fabricante} ${orcamento.equipamento_modelo}</td></tr>`
            : ''
        }
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px;text-align:left;">Produto</th>
            <th style="padding:8px;text-align:center;">Qtd</th>
            <th style="padding:8px;text-align:right;">Valor Unit.</th>
            <th style="padding:8px;text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${linhasItens}</tbody>
      </table>
      <p style="text-align:right;font-size:18px;font-weight:bold;margin-top:16px;">
        Total: R$ ${Number(orcamento.valor_total).toFixed(2)}
      </p>
      ${orcamento.observacoes ? `<p><strong>Observações:</strong> ${orcamento.observacoes}</p>` : ''}
      ${
        pix && (pix.chave_pix || pix.qrcode_imagem)
          ? `<div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;">
               <h3 style="color:#1e293b;margin:0 0 8px;">Pagamento via Pix</h3>
               <table style="width:100%;"><tr>
                 ${pix.qrcode_imagem ? `<td style="vertical-align:middle;padding-right:16px;"><img src="cid:pixqrcode" alt="QR Code Pix" style="width:140px;height:140px;object-fit:contain;border:1px solid #e2e8f0;border-radius:8px;" /></td>` : ''}
                 ${pix.chave_pix ? `<td style="vertical-align:middle;"><strong>Chave Pix:</strong><br/>${pix.chave_pix}</td>` : ''}
               </tr></table>
             </div>`
          : ''
      }
      <p style="color:#64748b;font-size:12px;margin-top:24px;">
        Este orçamento foi enviado por ${orcamento.empresa_razao_social}.
      </p>
    </div>
  `;

  let sucesso = true;
  let erroMensagem: string | null = null;
  try {
    await sendSystemEmail({
      to: destinatarioFinal,
      subject: `Orçamento #${orcamento.codigo} — ${orcamento.empresa_razao_social}`,
      text: `Olá, ${orcamento.cliente_nome}! Segue o orçamento #${orcamento.codigo}. Valor total: R$ ${Number(orcamento.valor_total).toFixed(2)}.`,
      html,
      attachments: pix?.qrcode_imagem
        ? [
            {
              filename: 'pix-qrcode.png',
              content: pix.qrcode_imagem,
              cid: 'pixqrcode',
              contentType: pix.qrcode_tipo || 'image/png',
            },
          ]
        : undefined,
    });
  } catch (err) {
    sucesso = false;
    erroMensagem = err instanceof Error ? err.message : 'Erro desconhecido ao enviar e-mail.';
  }

  await pool.query(
    `INSERT INTO orcamento_envios_log (orcamento_codigo, destinatario, sucesso, erro_mensagem, empresa_codigo)
     VALUES ($1, $2, $3, $4, $5)`,
    [codigo, destinatarioFinal, sucesso, erroMensagem, session.empresa_codigo]
  );

  if (!sucesso) {
    return NextResponse.json({ error: erroMensagem || 'Não foi possível enviar o e-mail.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, destinatario: destinatarioFinal });
}
