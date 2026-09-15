import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import LogoutButton from './logout-button';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/');
  }

  return (
    <div className="dashboard-body">
      <header className="app-header">
        <h1>IMPRESSAO3D</h1>
        <LogoutButton />
      </header>
      <div className="dashboard-content">
        <div className="card">
          <p>
            Bem-vindo, <strong>{session.nome}</strong>
          </p>
          <p>
            Nível: <strong>{session.nivel}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
