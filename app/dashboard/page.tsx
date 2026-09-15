import { getSession } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await getSession();

  return (
    <div className="card">
      <p>
        Bem-vindo, <strong>{session?.nome}</strong>
      </p>
      <p>
        Nível: <strong>{session?.nivel}</strong>
      </p>
    </div>
  );
}
