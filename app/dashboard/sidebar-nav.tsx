'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavGroup {
  title: string;
  links: { href: string; label: string }[];
}

const groups: NavGroup[] = [
  {
    title: 'Administração',
    links: [
      { href: '/dashboard/usuarios', label: 'Cadastro de Usuários' },
      { href: '/dashboard/empresas', label: 'Cadastro de Empresas' },
      { href: '/dashboard/vinculos', label: 'Usuários x Empresas' },
      { href: '/dashboard/configuracao-email', label: 'Configuração de E-mail' },
    ],
  },
  {
    title: 'Cadastros',
    links: [
      { href: '/dashboard/produtos', label: 'Cadastro de Produto' },
      { href: '/dashboard/clientes', label: 'Cadastro de Clientes' },
      { href: '/dashboard/materia-prima', label: 'Cadastro de Matéria Prima' },
      { href: '/dashboard/tipos-materia-prima', label: 'Cadastro de Tipo' },
      { href: '/dashboard/unidades-medida', label: 'Cadastro de Unidade de Medida' },
      { href: '/dashboard/estoque', label: 'Controle de Estoque' },
    ],
  },
  {
    title: 'Movimentos',
    links: [
      { href: '/dashboard/orcamentos', label: 'Orçamentos Pendentes' },
      { href: '/dashboard/orcamentos-aprovados', label: 'Orçamentos Aprovados' },
      { href: '/dashboard/orcamentos-reprovados', label: 'Orçamentos Reprovados' },
      { href: '/dashboard/orcamentos-em-producao', label: 'Em Produção' },
      { href: '/dashboard/orcamentos-finalizados', label: 'Finalizados' },
      { href: '/dashboard/orcamentos-pendente-entrega', label: 'Pendente de Entrega' },
      { href: '/dashboard/orcamentos-entregues', label: 'Entregues' },
    ],
  },
  {
    title: 'Financeiro',
    links: [
      { href: '/dashboard/contas-receber', label: 'Contas a Receber' },
      { href: '/dashboard/contas-pagar', label: 'Contas a Pagar' },
      { href: '/dashboard/movimentacao-financeira', label: 'Movimentação Financeira' },
    ],
  },
  {
    title: 'Configurações',
    links: [
      { href: '/dashboard/equipamentos', label: 'Cadastro de Equipamentos' },
      { href: '/dashboard/bancos', label: 'Cadastro de Banco' },
      { href: '/dashboard/logo-empresa', label: 'Logo da Empresa' },
      { href: '/dashboard/parametros-custo', label: 'Parâmetros de Custo' },
      { href: '/dashboard/configuracao-pix', label: 'Configuração Pix' },
    ],
  },
];

export default function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.map((g) => [g.title, true]))
  );

  return (
    <nav className="sidebar-nav">
      <Link href="/dashboard" className={pathname === '/dashboard' ? 'sidebar-link active' : 'sidebar-link'}>
        Início
      </Link>

      {isAdmin &&
        groups.map((group) => (
          <div className="sidebar-group" key={group.title}>
            <button
              type="button"
              className="sidebar-group-toggle"
              onClick={() => setOpenGroups({ ...openGroups, [group.title]: !openGroups[group.title] })}
            >
              {group.title}
              <span>{openGroups[group.title] ? '▾' : '▸'}</span>
            </button>
            {openGroups[group.title] && (
              <div className="sidebar-subnav">
                {group.links.map((link) => (
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
        ))}
    </nav>
  );
}
