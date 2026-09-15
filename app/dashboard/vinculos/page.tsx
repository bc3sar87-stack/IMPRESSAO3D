'use client';

import { useEffect, useState } from 'react';
import SearchBox from '../search-box';

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
  const [busca, setBusca] = useState('');
  const [buscaEmpresa, setBuscaEmpresa] = useState('');

  const usuariosFiltrados = usuarios.filter((u) => {
    const q = busca.toLowerCase();
    return u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const empresasFiltradas = empresas.filter((emp) =>
    emp.razao_social.toLowerCase().includes(buscaEmpresa.toLowerCase())
  );

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

      <SearchBox value={busca} onChange={setBusca} placeholder="Pesquisar por nome ou e-mail..." />

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
            {usuariosFiltrados.map((u) => (
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
            {usuariosFiltrados.length === 0 && (
              <tr>
                <td colSpan={4}>Nenhum usuário encontrado.</td>
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
            <>
              <SearchBox
                value={buscaEmpresa}
                onChange={setBuscaEmpresa}
                placeholder="Pesquisar empresa..."
              />
              <div className="checklist">
                {empresasFiltradas.map((emp) => (
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
