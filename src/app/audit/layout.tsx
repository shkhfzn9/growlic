import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Growlic - Free Software & Automation Audit',
  description:
    'Custom websites, client portals, mobile apps & AI workflow automation built to grow your business. Claim your 100% free engineering & software audit.',
  openGraph: {
    title: 'Your Business Deserves Better Software | Free Audit by Growlic',
    description:
      'Custom websites, client portals, mobile apps & AI automation. Claim your free engineering & workflow audit.',
    url: 'https://growlic.vercel.app/audit',
    siteName: 'Growlic',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Your Business Deserves Better Software | Growlic',
    description:
      'Custom websites, client portals, mobile apps & AI automation. Claim your free engineering & workflow audit.',
  },
};

export default function AuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
