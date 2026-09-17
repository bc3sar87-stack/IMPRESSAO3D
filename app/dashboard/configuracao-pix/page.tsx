'use client';

import { useEffect, useState } from 'react';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const TIPOS_CHAVE = [
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'TELEFONE', label: 'Telefone' },
  { value: 'ALEATORIA', label: 'Chave aleatória' },
];

const PLACEHOLDERS_CHAVE: Record<string, string> = {
  CPF: '123.456.789-00',
  CNPJ: '12.345.678/0001-90',
  EMAIL: 'contato@empresa.com',
  TELEFONE: '(11) 91234-5678',
  ALEATORIA: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
};

export default function ConfiguracaoPixPage() {
  const [chavePix, setChavePix] = useState('');
  const [tipoChave, setTipoChave] = useState('');
  const [nomeRecebedor, setNomeRecebedor] = useState('');
  const [cidade, setCidade] = useState('');
  const [qrcodePreview, setQrcodePreview] = useState('');
  const [qrcodeBase64, setQrcodeBase64] = useState('');
  const [qrcodeTipo, setQrcodeTipo] = useState('');
  const [removerQrcode, setRemoverQrcode] = useState(false);
  const [ampliarAberto, setAmpliarAberto] = useState(false);
  const [qrDinamicoPreview, setQrDinamicoPreview] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/configuracao-pix');
    if (res.ok) {
      const data = await res.json();
      setChavePix(data.chave_pix || '');
      setTipoChave(data.tipo_chave || '');
      setNomeRecebedor(data.nome_recebedor || '');
      setCidade(data.cidade || '');
      setQrcodePreview(data.tem_qrcode ? `/api/configuracao-pix/qrcode?t=${Date.now()}` : '');
      setQrDinamicoPreview(
        data.chave_pix && data.nome_recebedor && data.cidade
          ? `/api/configuracao-pix/qrcode-preview?t=${Date.now()}`
          : ''
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleQrcodeFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('O arquivo colado/selecionado precisa ser uma imagem.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 4MB.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [, base64] = dataUrl.split(',');
      setQrcodeBase64(base64);
      setQrcodeTipo(file.type);
      setQrcodePreview(dataUrl);
      setRemoverQrcode(false);
    };
    reader.readAsDataURL(file);
  }

  function handleQrcodePaste(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
    if (item) {
      e.preventDefault();
      handleQrcodeFile(item.getAsFile());
    }
  }

  function handleRemoverQrcode() {
    setQrcodeBase64('');
    setQrcodeTipo('');
    setQrcodePreview('');
    setRemoverQrcode(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch('/api/configuracao-pix', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chave_pix: chavePix,
          tipo_chave: tipoChave || undefined,
          nome_recebedor: nomeRecebedor,
          cidade: cidade,
          qrcode_base64: qrcodeBase64 || undefined,
          qrcode_tipo: qrcodeTipo || undefined,
          remover_qrcode: removerQrcode,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Não foi possível salvar.');
        return;
      }
      setQrcodeBase64('');
      setQrcodeTipo('');
      setRemoverQrcode(false);
      setSaved(true);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Configuração Pix</h2>
      </div>

      <div className="card">
        {error && <div className="error-msg">{error}</div>}
        {saved && <div className="success-msg">Configuração salva com sucesso.</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Tipo de Chave</label>
              <select value={tipoChave} onChange={(e) => setTipoChave(e.target.value)}>
                <option value="">Selecione...</option>
                {TIPOS_CHAVE.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="hint">Necessário para o sistema formatar a chave corretamente no QR Code.</p>
            </div>
            <div className="field">
              <label>Chave Pix</label>
              <input
                value={chavePix}
                onChange={(e) => setChavePix(e.target.value)}
                placeholder={PLACEHOLDERS_CHAVE[tipoChave] || 'CPF, CNPJ, e-mail, telefone ou chave aleatória'}
              />
            </div>
            <div className="field">
              <label>Nome do Recebedor</label>
              <input
                value={nomeRecebedor}
                onChange={(e) => setNomeRecebedor(e.target.value.toUpperCase())}
                maxLength={25}
                placeholder="Nome completo ou razão social"
              />
              <p className="hint">Máximo 25 caracteres, sem acentos (exigência do padrão Pix).</p>
            </div>
            <div className="field">
              <label>Cidade</label>
              <input
                value={cidade}
                onChange={(e) => setCidade(e.target.value.toUpperCase())}
                maxLength={15}
                placeholder="Cidade da agência"
              />
              <p className="hint">Máximo 15 caracteres.</p>
            </div>
          </div>

          <p className="hint" style={{ marginTop: -4 }}>
            Preenchendo Chave, Nome e Cidade, o sistema gera automaticamente o QR Code Pix com o valor de cada
            pedido na hora de imprimir ou enviar o orçamento por e-mail.
          </p>

          {qrDinamicoPreview && (
            <div className="field" style={{ maxWidth: 220 }}>
              <label>Prévia do QR Code (gerado pelo sistema)</label>
              <img
                src={qrDinamicoPreview}
                alt="Prévia QR Code Pix"
                className="paste-zone-preview"
                style={{ background: '#fff', padding: 8, border: '1px solid #e2e8f0', borderRadius: 8 }}
              />
              <p className="hint">Sem valor definido — o valor do pedido é incluído automaticamente na impressão/e-mail.</p>
            </div>
          )}

          <div className="form-grid" style={{ marginTop: 8 }}>
            <div className="field">
              <label>QR Code estático (opcional)</label>
              <div className="paste-zone" tabIndex={0} onPaste={handleQrcodePaste}>
                {qrcodePreview ? (
                  <img
                    src={qrcodePreview}
                    alt="QR Code Pix"
                    className="paste-zone-preview"
                    style={{ cursor: 'zoom-in' }}
                    onClick={() => setAmpliarAberto(true)}
                    title="Clique para ampliar"
                  />
                ) : (
                  <span className="hint" style={{ margin: 0 }}>
                    Clique aqui e pressione Ctrl+V para colar uma imagem
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="file" accept="image/*" onChange={(e) => handleQrcodeFile(e.target.files?.[0] || null)} />
                {qrcodePreview && (
                  <button type="button" className="btn-small danger" onClick={handleRemoverQrcode}>
                    Remover QR Code
                  </button>
                )}
              </div>
              <p className="hint">
                Máximo 4MB. Usado apenas se Nome do Recebedor ou Cidade não estiverem preenchidos (nesse caso o
                sistema não consegue gerar o QR Code automaticamente).
              </p>
            </div>
          </div>

          <button
            className="btn-primary"
            type="submit"
            disabled={saving}
            style={{ width: 'auto', padding: '10px 24px', marginTop: 8 }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>

      {ampliarAberto && qrcodePreview && (
        <div className="modal-overlay" onClick={() => setAmpliarAberto(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480, padding: 12, background: 'transparent', boxShadow: 'none' }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button
                type="button"
                className="modal-close"
                style={{ background: '#fff', borderRadius: 8 }}
                onClick={() => setAmpliarAberto(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <img
              src={qrcodePreview}
              alt="QR Code Pix ampliado"
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8, background: '#fff' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
