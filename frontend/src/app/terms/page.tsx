// src/app/terms/page.tsx
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { SUPPORT_PHONE_DISPLAY } from '@/lib/constants';

export const metadata: Metadata = { title: 'Terms & Conditions - GoregaonMeds' };

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="container-app pb-28 pt-6 sm:py-16 md:pb-16">
        <div className="mx-auto max-w-2xl bg-white p-6 sm:p-8 rounded-3xl shadow-sm ring-1 ring-brand-100">
          <h1 className="font-display text-3xl font-extrabold text-ink mb-6">Terms & Conditions</h1>
          
          <div className="space-y-6 text-sm text-ink-muted leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-ink mb-2">1. Acceptance of Terms</h2>
              <p>By accessing and using GoregaonMeds, you accept and agree to be bound by the terms and provisions of this agreement.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-ink mb-2">2. Prescription Medicines</h2>
              <p>For orders containing prescription medicines, a valid prescription from a registered medical practitioner is mandatory. Our pharmacist will review the uploaded prescription before confirming the order.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-ink mb-2">3. Delivery Logistics</h2>
              <p>We currently operate and deliver exclusively within the Goregaon area. Delivery times may vary depending on medicine availability and weather conditions.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-ink mb-2">4. Cancellations & Returns</h2>
              <p>Orders can be cancelled before they are out for delivery. For returns of incorrect or damaged medicines, please contact our support team within 24 hours of receiving your order.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-ink mb-2">5. Contact Information</h2>
              <p>For any queries regarding these terms, reach out to us at <strong>{SUPPORT_PHONE_DISPLAY}</strong>.</p>
            </section>
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}