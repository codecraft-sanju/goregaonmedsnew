//src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import Providers from './providers';
import Shell from '@/components/shell';
import './globals.css';
export const metadata: Metadata = {
  title: {
    default: 'GoregaonMeds · Care, closer to home.',
    template: '%s · GoregaonMeds',
  },
  description:
    'Medicines, personal care, and everyday wellness from your neighbourhood pharmacies in Goregaon East.',
  manifest: '/manifest.webmanifest',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#087f74',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
