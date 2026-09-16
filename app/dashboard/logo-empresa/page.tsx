'use client';

import { useEffect, useState } from 'react';

export default function LogoEmpresaPage() {
  const [logoPreview, setLogoPreview] = useState('');
  const [logoBase64, setLogoBase64] = useState('');
  const [logoTipo, setLogoTipo] = useState('');
  const [removerLogo, setRemoverLogo] = useState(false);
  const [ampliarAberto, setAmpliarAberto] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/logo-empresa');
    if (res.ok) {
      const data = await res.json();
      setLogoPreview(data.tem_logo ? `/api/logo-empresa/imagem?t=${Date.now()}` : '');
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleLogoFile(file: File | null) {
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
      setLogoBase64(base64);
      setLogoTipo(file.type);
      setLogoPreview(dataUrl);
      setRemoverLogo(false);
    };
    reader.readAsDataURL(file);
  }

  function handleLogoPaste(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
    if (item) {
      e.preventDefault();
      handleLogoFile(item.getAsFile());
    }
  }

  function handleRemoverLogo() {
    setLogoBase64('');
    setLogoTipo('');
    setLogoPreview('');
    setRemoverLogo(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch('/api/logo-empresa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo_base64: logoBase64 || undefined,
          logo_tipo: logoTipo || undefined,
          remover_logo: removerLogo,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Não foi possível salvar.');
        return;
      }
      setLogoBase64('');
      setLogoTipo('');
      setRemoverLogo(false);
      setSaved(true);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Logo da Empresa</h2>
      </div>

      <div className="card">
        {error && <div className="error-msg">{error}</div>}
        {saved && <div className="success-msg">Logo salva com sucesso.</div>}

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ maxWidth: 320 }}>
            <label>Logo</label>
            <div className="paste-zone" tabIndex={0} onPaste={handleLogoPaste}>
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo da empresa"
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
              <input type="file" accept="image/*" onChange={(e) => handleLogoFile(e.target.files?.[0] || null)} />
              {logoPreview && (
                <button type="button" className="btn-small danger" onClick={handleRemoverLogo}>
                  Remover logo
                </button>
              )}
            </div>
            <p className="hint">
              Máximo 4MB. Esta logo aparece no menu do sistema, no PDF do orçamento e no e-mail enviado ao cliente.
            </p>
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

      {ampliarAberto && logoPreview && (
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
              src={logoPreview}
              alt="Logo ampliada"
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8, background: '#fff' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
