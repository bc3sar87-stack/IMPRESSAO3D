'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'Início', adminOnly: false },
  { href: '/dashboard/usuarios', label: 'Cadastro de Usuários', adminOnly: true },
  { href: '/dashboard/empresas', label: 'Cadastro de Empresas', adminOnly: true },
  { href: '/dashboard/vinculos', label: 'Usuários x Empresas', adminOnly: true },
];

export default function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav">
      {links
        .filter((link) => !link.adminOnly || isAdmin)
        .map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname === link.href ? 'sidebar-link active' : 'sidebar-link'}
          >
            {link.label}
          </Link>
        ))}
    </nav>
  );
}
