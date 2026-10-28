import type {Metadata} from 'next';
import {Plus_Jakarta_Sans, JetBrains_Mono} from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'ONEORIGIN — 1origin.dev | Sovereign AI Cloud Platform',
  description:
    'Sovereign AI Cloud Platform for Autonomous Agents, Edge Workers Hosting, R2 Object Storage, AI Gateway, Durable Workflows, CI/CD Deployments, and Webhooks.',
  openGraph: {
    title: 'ONEORIGIN — 1origin.dev | Sovereign AI Cloud Platform',
    description:
      'Sovereign AI Cloud Platform for Autonomous Agents, Edge Workers Hosting, R2 Object Storage, AI Gateway, Durable Workflows, CI/CD Deployments, and Webhooks.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ONEORIGIN — 1origin.dev | Sovereign AI Cloud Platform',
    description:
      'Sovereign AI Cloud Platform for Autonomous Agents, Edge Workers Hosting, R2 Object Storage, AI Gateway, Durable Workflows, CI/CD Deployments, and Webhooks.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${jetbrainsMono.variable} dark`}>
      <body
        suppressHydrationWarning
        className="bg-[#0a0a0a] text-white font-sans antialiased selection:bg-[#f38020]/30 selection:text-white min-h-screen"
      >
        {children}
      </body>
    </html>
  );
}
