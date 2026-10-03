import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap', weight: ['600', '700', '800'] });

export const metadata: Metadata = {
  title: { default: 'GoregaonMeds · Medicines delivered in Goregaon East', template: '%s · GoregaonMeds' },
  description:
    'Order medicines in Goregaon East, Mumbai. Type your medicines or upload a prescription and pay at delivery by cash or UPI. Healthzone & Cosmetic is open 24x7.',
  applicationName: 'GoregaonMeds',
  formatDetection: { telephone: true },
};

export const viewport: Viewport = {
  themeColor: '#156253',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-dvh font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
