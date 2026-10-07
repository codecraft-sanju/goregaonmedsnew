//src/components/home/WhyChoose.tsx
import { BadgeCheck, HandCoins, ShieldCheck, Store } from 'lucide-react';
import { Reveal } from './Reveal';

const reasons = [
  { icon: Store, title: 'Three local pharmacies', text: 'Apple Pharmacy, Lotus Pharmacy and Healthzone & Cosmetic, all in Goregaon East.' },
  { icon: HandCoins, title: 'Pay at delivery', text: 'No online payment. Pay by cash or UPI / QR when your order arrives.' },
  { icon: BadgeCheck, title: 'Checked before packing', text: 'The pharmacy team reviews every order before it is packed.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Track orders with a random Order ID and your number’s last 4 digits.' },
];

export function WhyChoose() {
  return (
    <section className="hidden md:block container-app py-14" aria-labelledby="why-title">
      <p className="eyebrow">Why GoregaonMeds</p>
      <h2 id="why-title" className="section-title mt-2">Your neighbourhood pharmacy, now on your phone</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {reasons.map((reason, index) => (
          <Reveal key={reason.title} delay={index * 0.06} className="card p-6">
            <reason.icon className="h-6 w-6 text-brand-600" aria-hidden />
            <h3 className="mt-4 font-semibold">{reason.title}</h3>
            <p className="mt-1.5 text-sm text-ink-muted">{reason.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}