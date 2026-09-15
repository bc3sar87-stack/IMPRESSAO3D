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
  const [pending, setPending] = useState<string | null>(null);

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

  function isLinked(usuarioCodigo: number, empresaCodigo: number) {
    return vinculos.some(
      (v) => v.usuario_codigo === usuarioCodigo && v.empresa_codigo === empresaCodigo
    );
  }

  async function toggle(usuarioCodigo: number, empresaCodigo: number) {
    const key = `${usuarioCodigo}-${empresaCodigo}`;
    setPending(key);
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

      {empresas.length === 0 || usuarios.length === 0 ? (
        <div className="card">
          Cadastre pelo menos um usuário e uma empresa para poder criar vínculos.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuário</th>
                {empresas.map((emp) => (
                  <th key={emp.codigo}>{emp.razao_social}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.codigo}>
                  <td>
                    {u.nome}
                    <br />
                    <small style={{ color: '#64748b' }}>{u.email}</small>
                  </td>
                  {empresas.map((emp) => {
                    const key = `${u.codigo}-${emp.codigo}`;
                    return (
                      <td key={emp.codigo} style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isLinked(u.codigo, emp.codigo)}
                          disabled={pending === key}
                          onChange={() => toggle(u.codigo, emp.codigo)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
