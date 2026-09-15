import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { loadEmailConfig, buildTransporter } from '@/lib/mailer';

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { destinatario } = await request.json().catch(() => ({}));
  if (!destinatario) {
    return NextResponse.json({ error: 'Informe o e-mail de destino.' }, { status: 400 });
  }

  const config = await loadEmailConfig();
  if (!config || !config.servidor_smtp || !config.porta || !config.email_remetente) {
    return NextResponse.json(
      { error: 'Salve as configurações antes de testar.' },
      { status: 400 }
    );
  }

  try {
    const transporter = buildTransporter(config);
    await transporter.sendMail({
      from: config.nome_remetente
        ? `"${config.nome_remetente}" <${config.email_remetente}>`
        : config.email_remetente,
      to: destinatario,
      cc: config.email_cc || undefined,
      subject: 'E-mail de teste - 3D print control',
      text: 'Este é um e-mail de teste enviado pelo sistema 3D print control.',
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao enviar e-mail.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
