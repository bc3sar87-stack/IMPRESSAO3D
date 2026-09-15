import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import LogoutButton from './logout-button';
import SidebarNav from './sidebar-nav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-title">IMPRESSAO3D</div>
        <SidebarNav isAdmin={session.nivel === 'ADMINISTRADOR'} />
      </aside>
      <div className="main">
        <header className="app-header">
          <span>Bem-vindo, {session.nome}</span>
          <LogoutButton />
        </header>
        <div className="dashboard-content">{children}</div>
      </div>
    </div>
  );
}
