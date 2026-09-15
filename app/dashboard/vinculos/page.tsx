'use client';

import { useEffect, useState } from 'react';

interface Usuario {
  codigo: number;
  nome: string;
  email: string;
}

interface Empresa {
  codigo: number;
  razao_social: string;
}

interface Vinculo {
  usuario_codigo: number;
  empresa_codigo: number;
}

export default function VinculosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [selecionado, setSelecionado] = useState<Usuario | null>(null);
  const [pending, setPending] = useState<number | null>(null);

  async function loadAll() {
    const [u, e, v] = await Promise.all([
      fetch('/api/usuarios').then((r) => r.json()),
      fetch('/api/empresas').then((r) => r.json()),
      fetch('/api/vinculos').then((r) => r.json()),
    ]);
    setUsuarios(u);
    setEmpresas(e);
    setVinculos(v);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function empresasDoUsuario(usuarioCodigo: number) {
    return vinculos.filter((v) => v.usuario_codigo === usuarioCodigo).length;
  }

  function isLinked(usuarioCodigo: number, empresaCodigo: number) {
    return vinculos.some(
      (v) => v.usuario_codigo === usuarioCodigo && v.empresa_codigo === empresaCodigo
    );
  }

  async function toggle(usuarioCodigo: number, empresaCodigo: number) {
    setPending(empresaCodigo);
    try {
      if (isLinked(usuarioCodigo, empresaCodigo)) {
        await fetch(`/api/vinculos?usuario_codigo=${usuarioCodigo}&empresa_codigo=${empresaCodigo}`, {
          method: 'DELETE',
        });
      } else {
        await fetch('/api/vinculos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario_codigo: usuarioCodigo, empresa_codigo: empresaCodigo }),
        });
      }
      await loadAll();
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Usuários x Empresas</h2>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>E-mail</th>
              <th>Empresas vinculadas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.codigo}>
                <td>{u.nome}</td>
                <td>{u.email}</td>
                <td>{empresasDoUsuario(u.codigo)}</td>
                <td>
                  <button className="btn-small" onClick={() => setSelecionado(u)}>
                    Gerenciar acesso
                  </button>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={4}>Nenhum usuário cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selecionado && (
        <div className="card">
          <div className="card-header">
            <h3>
              Empresas de {selecionado.nome}
              <br />
              <small style={{ color: '#64748b', fontWeight: 400 }}>{selecionado.email}</small>
            </h3>
            <button className="btn-small" onClick={() => setSelecionado(null)}>
              Fechar
            </button>
          </div>

          {empresas.length === 0 ? (
            <p style={{ color: '#64748b' }}>Nenhuma empresa cadastrada ainda.</p>
          ) : (
            <div className="checklist">
              {empresas.map((emp) => (
                <label key={emp.codigo} className="checklist-item">
                  <input
                    type="checkbox"
                    checked={isLinked(selecionado.codigo, emp.codigo)}
                    disabled={pending === emp.codigo}
                    onChange={() => toggle(selecionado.codigo, emp.codigo)}
                  />
                  {emp.razao_social}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
