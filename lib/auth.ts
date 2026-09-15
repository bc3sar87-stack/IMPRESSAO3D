import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export interface SessionPayload {
  codigo: number;
  nome: string;
  nivel: 'USUARIO' | 'ADMINISTRADOR';
  empresa_codigo: number | null;
  multiEmpresa: boolean;
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

export function setSessionCookie(response: NextResponse, payload: SessionPayload) {
  response.cookies.set(SESSION_COOKIE, signSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60,
  });
}
