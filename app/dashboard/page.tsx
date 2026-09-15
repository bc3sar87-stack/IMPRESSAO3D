import { getSession } from '@/lib/auth';
import { pool } from '@/lib/db';

export default async function DashboardPage() {
  const session = await getSession();

  const { rows: empresas } = session
    ? await pool.query(
        `SELECT e.codigo, e.razao_social
         FROM empresa e
         JOIN usuarios_empresas ue ON ue.empresa_codigo = e.codigo
         WHERE ue.usuario_codigo = $1
         ORDER BY e.razao_social`,
        [session.codigo]
      )
    : { rows: [] };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <p>
          Bem-vindo, <strong>{session?.nome}</strong>
        </p>
        <p>
          Nível: <strong>{session?.nivel}</strong>
        </p>
      </div>

      <div className="card">
        <p style={{ marginTop: 0 }}>
          <strong>Empresas vinculadas</strong>
        </p>
        {empresas.length === 0 ? (
          <p style={{ color: '#64748b' }}>Nenhuma empresa vinculada ao seu usuário ainda.</p>
        ) : (
          <ul>
            {empresas.map((e) => (
              <li key={e.codigo}>{e.razao_social}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
