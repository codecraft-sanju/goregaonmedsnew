// src/app/privacy/page.tsx
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { SUPPORT_PHONE_DISPLAY } from '@/lib/constants';

export const metadata: Metadata = { title: 'Privacy Policy - GoregaonMeds' };

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="container-app pb-28 pt-6 sm:py-16 md:pb-16">
        <div className="mx-auto max-w-2xl bg-white p-6 sm:p-8 rounded-3xl shadow-sm ring-1 ring-brand-100">
          <h1 className="font-display text-3xl font-extrabold text-ink mb-6">Privacy Policy</h1>
          
          <div className="space-y-6 text-sm text-ink-muted leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-ink mb-2">1. Information We Collect</h2>
              <p>We collect information you provide directly to us, such as your name, phone number, and delivery address when you place an order. If you upload a prescription, we securely store that image to fulfill your medical needs.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-ink mb-2">2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Process and deliver your medicine orders.</li>
                <li>Communicate with you regarding your order status.</li>
                <li>Improve our local delivery services in Goregaon East.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-ink mb-2">3. Data Security</h2>
              <p>Your details are stored securely. We do not sell or share your personal data with third-party marketing companies. Prescription images are strictly used for verifying and dispensing medicines by authorized pharmacists.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-ink mb-2">4. Contact Us</h2>
              <p>If you have any questions about this Privacy Policy, please contact us at: <strong>{SUPPORT_PHONE_DISPLAY}</strong>.</p>
            </section>
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}