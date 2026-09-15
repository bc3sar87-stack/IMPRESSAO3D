import { NextRequest, NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';

export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === '/';
  const isSelecionarEmpresaPage = pathname === '/selecionar-empresa';

  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!session) {
    return NextResponse.next();
  }

  const precisaSelecionarEmpresa = session.multiEmpresa && !session.empresa_codigo;

  if (isLoginPage) {
    return NextResponse.redirect(
      new URL(precisaSelecionarEmpresa ? '/selecionar-empresa' : '/dashboard', request.url)
    );
  }

  if (precisaSelecionarEmpresa && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/selecionar-empresa', request.url));
  }

  if (isSelecionarEmpresaPage && !session.multiEmpresa) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/selecionar-empresa'],
};
