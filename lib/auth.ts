import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export interface SessionPayload {
  codigo: number;
  nome: string;
  nivel: 'USUARIO' | 'ADMINISTRADOR';
}

const SECRET = process.env.JWT_SECRET;

export function signSession(payload: SessionPayload): string {
  if (!SECRET) throw new Error('JWT_SECRET não configurado');
  return jwt.sign(payload, SECRET, { expiresIn: '8h' });
}

export function verifySession(token: string): SessionPayload | null {
  if (!SECRET) return null;
  try {
    return jwt.verify(token, SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = 'session';

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
}

export async function requireAdmin(): Promise<SessionPayload | null> {
  const session = await getSession();
  return session?.nivel === 'ADMINISTRADOR' ? session : null;
}
