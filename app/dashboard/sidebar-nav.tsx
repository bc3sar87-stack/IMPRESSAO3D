'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const adminLinks = [
  { href: '/dashboard/usuarios', label: 'Cadastro de Usuários' },
  { href: '/dashboard/empresas', label: 'Cadastro de Empresas' },
  { href: '/dashboard/vinculos', label: 'Usuários x Empresas' },
  { href: '/dashboard/configuracao-email', label: 'Configuração de E-mail' },
];

export default function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const [adminOpen, setAdminOpen] = useState(true);

  return (
    <nav className="sidebar-nav">
      <Link href="/dashboard" className={pathname === '/dashboard' ? 'sidebar-link active' : 'sidebar-link'}>
        Início
      </Link>

      {isAdmin && (
        <div className="sidebar-group">
          <button
            type="button"
            className="sidebar-group-toggle"
            onClick={() => setAdminOpen(!adminOpen)}
          >
            Administração
            <span>{adminOpen ? '▾' : '▸'}</span>
          </button>
          {adminOpen && (
            <div className="sidebar-subnav">
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={pathname === link.href ? 'sidebar-link active' : 'sidebar-link'}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
