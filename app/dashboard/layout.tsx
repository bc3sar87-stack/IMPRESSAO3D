import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { pool } from '@/lib/db';
import LogoutButton from './logout-button';
import SidebarNav from './sidebar-nav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/');
  }

  let empresaNome: string | null = null;
  if (session.empresa_codigo) {
    const { rows } = await pool.query(`SELECT razao_social FROM empresa WHERE codigo = $1`, [
      session.empresa_codigo,
    ]);
    empresaNome = rows[0]?.razao_social ?? null;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-title">
          <img src="/logo-full-light.svg" alt="3D Print Control" height={22} />
        </div>
        <SidebarNav isAdmin={session.nivel === 'ADMINISTRADOR'} />
      </aside>
      <div className="main">
        <header className="app-header">
          <span>
            Bem-vindo, {session.nome}
            {empresaNome && (
              <>
                {' '}
                — <strong>{empresaNome}</strong>
              </>
            )}
            {session.multiEmpresa && (
              <>
                {' '}
                (<Link href="/selecionar-empresa">Trocar empresa</Link>)
              </>
            )}
          </span>
          <LogoutButton />
        </header>
        <div className="dashboard-content">{children}</div>
      </div>
    </div>
  );
}
