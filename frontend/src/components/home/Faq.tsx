//src/components/home/Faq.tsx
import { ChevronDown } from 'lucide-react';
import { SUPPORT_PHONE_DISPLAY } from '@/lib/constants';

const faqs = [
  { q: 'Do I need to pay online?', a: 'No. You pay when your order arrives, by cash or UPI / QR. There is no online payment.' },
  { q: 'How do I know the final price?', a: 'The pharmacy confirms availability and the final payable amount after billing your order.' },
  {
    q: 'How does the first-order gift work?',
    a: 'Your first order qualifies for a free Dr. Morepen GlucoOne BG-03 when the medicines on your bill add up to the minimum amount or more after discounts. Cosmetics, FMCG, general items and delivery charges do not count. Eligibility is confirmed after billing.',
  },
  { q: 'Can I choose which pharmacy delivers?', a: 'No need. We route every order to the right pharmacy in Goregaon East so it reaches you fastest.' },
  { q: 'Do you deliver at night?', a: 'You can place a request any time. Healthzone & Cosmetic is open 24x7.' },
  { q: 'How do I track my order?', a: 'Use your Order ID and the last 4 digits of your mobile number on the Track page.' },
  { q: 'Something is wrong with my order', a: `Call us at ${SUPPORT_PHONE_DISPLAY} and keep your Order ID handy.` },
];

export function Faq() {
  return (
    <section id="faq" className="container-app scroll-mt-20 py-14" aria-labelledby="faq-title">
      <p className="eyebrow">FAQ</p>
      <h2 id="faq-title" className="section-title mt-2">Questions, answered</h2>
      <div className="card mt-8 divide-y divide-brand-100">
        {faqs.map((faq) => (
          <details key={faq.q} className="group px-6 py-1 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold">
              {faq.q}
              <ChevronDown className="h-5 w-5 shrink-0 text-ink-soft transition-transform duration-200 group-open:rotate-180" aria-hidden />
            </summary>
            <p className="pb-5 text-ink-muted">{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
