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

export default function ConfiguracaoPixPage() {
  const [chavePix, setChavePix] = useState('');
  const [qrcodePreview, setQrcodePreview] = useState('');
  const [qrcodeBase64, setQrcodeBase64] = useState('');
  const [qrcodeTipo, setQrcodeTipo] = useState('');
  const [removerQrcode, setRemoverQrcode] = useState(false);
  const [ampliarAberto, setAmpliarAberto] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/configuracao-pix');
    if (res.ok) {
      const data = await res.json();
      setChavePix(data.chave_pix || '');
      setQrcodePreview(data.tem_qrcode ? `/api/configuracao-pix/qrcode?t=${Date.now()}` : '');
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
              <label>Chave Pix</label>
              <input
                value={chavePix}
                onChange={(e) => setChavePix(e.target.value)}
                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
              />
              <p className="hint">Exibida no PDF e no e-mail do orçamento.</p>
            </div>
            <div className="field">
              <label>QR Code</label>
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
              <p className="hint">Máximo 4MB.</p>
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
