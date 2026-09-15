import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IMPRESSAO3D',
  description: 'Sistema de controle de impressão 3D',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
