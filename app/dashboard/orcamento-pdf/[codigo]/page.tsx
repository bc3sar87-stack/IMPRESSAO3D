'use client';

import { useEffect, useState, use } from 'react';

interface OrcamentoDetalhe {
  codigo: number;
  data: string;
  data_entrega: string | null;
  status: string;
  observacoes: string | null;
  valor_total: string;
  cliente_nome: string;
  cliente_documento: string;
  cliente_tipo_pessoa: 'PJ' | 'PF';
  cliente_telefone: string | null;
  cliente_email: string | null;
  cliente_endereco: string | null;
  empresa_razao_social: string;
  empresa_documento: string;
  empresa_tipo_pessoa: 'PJ' | 'PF';
  equipamento_fabricante: string | null;
  equipamento_modelo: string | null;
}

interface ItemOrcamento {
  codigo: number;
  produto_descricao: string;
  quantidade: string;
  valor_unitario: string;
  subtotal: string;
}

export default function OrcamentoPdfPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = use(params);
  const [orcamento, setOrcamento] = useState<OrcamentoDetalhe | null>(null);
  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [erro, setErro] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [temQrcodePix, setTemQrcodePix] = useState(false);
  const [temLogoEmpresa, setTemLogoEmpresa] = useState(false);

  useEffect(() => {
    async function load() {
      const [orcRes, itensRes, pixRes, logoRes] = await Promise.all([
        fetch(`/api/orcamentos/${codigo}`),
        fetch(`/api/orcamentos/${codigo}/itens`),
        fetch('/api/configuracao-pix'),
        fetch('/api/logo-empresa'),
      ]);
      if (!orcRes.ok) {
        const data = await orcRes.json().catch(() => ({}));
        setErro(data.error || 'Não foi possível carregar o orçamento.');
        return;
      }
      setOrcamento(await orcRes.json());
      if (itensRes.ok) setItens(await itensRes.json());
      if (pixRes.ok) {
        const pix = await pixRes.json();
        setChavePix(pix.chave_pix || '');
        setTemQrcodePix(pix.tem_qrcode);
      }
      if (logoRes.ok) {
        const logo = await logoRes.json();
        setTemLogoEmpresa(logo.tem_logo);
      }
    }
    load();
  }, [codigo]);

  if (erro) {
    return (
      <div className="card">
        <div className="error-msg">{erro}</div>
      </div>
    );
  }

  if (!orcamento) {
    return <p className="hint">Carregando...</p>;
  }

  return (
    <div id="orcamento-pdf">
      <div className="no-print" style={{ marginBottom: 16 }}>
        <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => window.print()}>
          Imprimir / Salvar PDF
        </button>
      </div>

      <div className="card" style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {temLogoEmpresa && (
              <img
                src="/api/logo-empresa/imagem"
                alt={orcamento.empresa_razao_social}
                style={{ maxHeight: 56, maxWidth: 120, objectFit: 'contain' }}
              />
            )}
            <div>
              <h2 style={{ margin: 0 }}>{orcamento.empresa_razao_social}</h2>
              <p className="hint" style={{ margin: '4px 0 0' }}>
                {orcamento.empresa_tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'}: {orcamento.empresa_documento}
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ margin: 0 }}>Orçamento #{orcamento.codigo}</h3>
            <p className="hint" style={{ margin: '4px 0 0' }}>
              Data: {new Date(orcamento.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
            </p>
            {orcamento.data_entrega && (
              <p className="hint" style={{ margin: '2px 0 0' }}>
                Entrega: {new Date(orcamento.data_entrega).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
              </p>
            )}
          </div>
        </div>

        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

        <h4 style={{ marginBottom: 8 }}>Cliente</h4>
        <p style={{ margin: '2px 0' }}>{orcamento.cliente_nome}</p>
        <p style={{ margin: '2px 0' }} className="hint">
          {orcamento.cliente_tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'}: {orcamento.cliente_documento}
        </p>
        {orcamento.cliente_telefone && (
          <p style={{ margin: '2px 0' }} className="hint">
            Telefone: {orcamento.cliente_telefone}
          </p>
        )}
        {orcamento.cliente_email && (
          <p style={{ margin: '2px 0' }} className="hint">
            E-mail: {orcamento.cliente_email}
          </p>
        )}
        {orcamento.cliente_endereco && (
          <p style={{ margin: '2px 0' }} className="hint">
            Endereço: {orcamento.cliente_endereco}
          </p>
        )}

        {orcamento.equipamento_fabricante && (
          <>
            <h4 style={{ marginTop: 20, marginBottom: 8 }}>Equipamento de Impressão</h4>
            <p style={{ margin: '2px 0' }}>
              {orcamento.equipamento_fabricante} {orcamento.equipamento_modelo}
            </p>
          </>
        )}

        <h4 style={{ marginTop: 20, marginBottom: 8 }}>Itens</h4>
        <table className="data-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Quantidade</th>
              <th>Valor Unitário</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.codigo}>
                <td>{item.produto_descricao}</td>
                <td>{item.quantidade}</td>
                <td>R$ {Number(item.valor_unitario).toFixed(2)}</td>
                <td>R$ {Number(item.subtotal).toFixed(2)}</td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr>
                <td colSpan={4}>Nenhum item adicionado.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ textAlign: 'right', marginTop: 16, fontSize: 20, fontWeight: 700 }}>
          Total: R$ {Number(orcamento.valor_total).toFixed(2)}
        </div>

        {orcamento.observacoes && (
          <>
            <h4 style={{ marginTop: 20, marginBottom: 8 }}>Observações</h4>
            <p style={{ margin: 0 }}>{orcamento.observacoes}</p>
          </>
        )}

        {(chavePix || temQrcodePix) && (
          <>
            <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
            <h4 style={{ marginBottom: 8 }}>Pagamento via Pix</h4>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              {temQrcodePix && (
                <img
                  src="/api/configuracao-pix/qrcode"
                  alt="QR Code Pix"
                  style={{ width: 140, height: 140, objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: 8 }}
                />
              )}
              {chavePix && (
                <p style={{ margin: 0 }}>
                  <strong>Chave Pix:</strong> {chavePix}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
