'use client';

import { useEffect, useState, FormEvent } from 'react';

interface ConfigEmail {
  ativo: boolean;
  servidor_smtp: string;
  porta: number | string;
  seguranca: 'SSL/TLS' | 'STARTTLS' | 'NENHUMA';
  usuario: string;
  tem_senha: boolean;
  email_remetente: string;
  nome_remetente: string;
  email_cc: string;
}

const empty: ConfigEmail = {
  ativo: false,
  servidor_smtp: '',
  porta: 465,
  seguranca: 'SSL/TLS',
  usuario: '',
  tem_senha: false,
  email_remetente: '',
  nome_remetente: '',
  email_cc: '',
};

export default function ConfiguracaoEmailPage() {
  const [config, setConfig] = useState<ConfigEmail>(empty);
  const [senha, setSenha] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [destinatario, setDestinatario] = useState('');
  const [testError, setTestError] = useState('');
  const [testOk, setTestOk] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch('/api/configuracao-email')
      .then((r) => r.json())
      .then(setConfig);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch('/api/configuracao-email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, senha: senha || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Não foi possível salvar.');
        return;
      }
      setSenha('');
      setSaved(true);
      const refreshed = await fetch('/api/configuracao-email').then((r) => r.json());
      setConfig(refreshed);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTestError('');
    setTestOk(false);
    setTesting(true);
    try {
      const res = await fetch('/api/configuracao-email/testar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinatario }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTestError(data.error || 'Não foi possível enviar o e-mail de teste.');
        return;
      }
      setTestOk(true);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'block' }}>
        <h2>Configuração de E-mail</h2>
        <p style={{ color: '#64748b', margin: '4px 0 0' }}>
          Configure o servidor SMTP para envio de e-mails pelo sistema
        </p>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {saved && <div className="success-msg">Configurações salvas com sucesso.</div>}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <h3>Configurações SMTP</h3>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={config.ativo}
                onChange={(e) => setConfig({ ...config, ativo: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Servidor SMTP *</label>
              <input
                value={config.servidor_smtp}
                onChange={(e) => setConfig({ ...config, servidor_smtp: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Porta *</label>
              <input
                type="number"
                value={config.porta}
                onChange={(e) => setConfig({ ...config, porta: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Segurança</label>
              <select
                value={config.seguranca}
                onChange={(e) =>
                  setConfig({ ...config, seguranca: e.target.value as ConfigEmail['seguranca'] })
                }
              >
                <option value="SSL/TLS">SSL/TLS — porta 465</option>
                <option value="STARTTLS">STARTTLS — porta 587</option>
                <option value="NENHUMA">Nenhuma</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Usuário</label>
              <input
                value={config.usuario}
                onChange={(e) => setConfig({ ...config, usuario: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder={config.tem_senha ? '••••••••' : ''}
              />
              <p className="hint">Deixe em branco para manter a senha atual.</p>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <h3>Remetente</h3>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>E-mail remetente *</label>
              <input
                type="email"
                value={config.email_remetente}
                onChange={(e) => setConfig({ ...config, email_remetente: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Nome remetente</label>
              <input
                value={config.nome_remetente}
                onChange={(e) => setConfig({ ...config, nome_remetente: e.target.value })}
              />
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label>E-mail em cópia (CC)</label>
              <input
                type="email"
                value={config.email_cc}
                onChange={(e) => setConfig({ ...config, email_cc: e.target.value })}
              />
            </div>
          </div>
        </div>

        <button className="btn-primary" type="submit" disabled={saving} style={{ width: 'auto', padding: '10px 24px' }}>
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </form>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <h3>Testar Envio</h3>
        </div>
        {testError && <div className="error-msg">{testError}</div>}
        {testOk && <div className="success-msg">E-mail de teste enviado com sucesso.</div>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            style={{
              flex: 1,
              minWidth: 220,
              padding: '10px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              fontSize: 15,
            }}
            type="email"
            placeholder="destinatario@exemplo.com"
            value={destinatario}
            onChange={(e) => setDestinatario(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={handleTest}
            disabled={testing || !destinatario}
          >
            {testing ? 'Enviando...' : 'Enviar Teste'}
          </button>
        </div>
        <p className="hint">
          Salve as configurações antes de testar. Um e-mail de teste será enviado para o endereço
          informado.
        </p>
      </div>
    </div>
  );
}
