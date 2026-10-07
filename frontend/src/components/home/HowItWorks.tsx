// src/components/home/HowItWorks.tsx
import { ClipboardCheck, PackageCheck, Send, Wallet } from 'lucide-react';
import { Reveal } from './Reveal';

const steps = [
  { icon: Send, title: 'Send your order', text: 'Type medicines or upload a prescription with your address.' },
  { icon: ClipboardCheck, title: 'Pharmacist confirms', text: 'We check availability and may call you to confirm details.' },
  { icon: PackageCheck, title: 'Packed & delivered', text: 'Your order is billed, packed and sent to your door.' },
  { icon: Wallet, title: 'Pay on arrival', text: 'Pay the final bill by cash or UPI / QR at delivery.' },
];

export function HowItWorks() {
  return (

    <section id="how-it-works" className="hidden md:block container-app py-14" aria-labelledby="how-title">
      <p className="eyebrow">How ordering works</p>
      <h2 id="how-title" className="section-title mt-2">Four simple steps</h2>
      <ol className="mt-8 grid gap-4 md:grid-cols-4">
        {steps.map((step, index) => (
          <Reveal key={step.title} delay={index * 0.07} className="relative">
            <li className="card h-full p-6">
              <span className="font-display text-sm font-bold text-brand-500">0{index + 1}</span>
              <step.icon className="mt-3 h-6 w-6 text-brand-700" aria-hidden />
              <h3 className="mt-3 font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm text-ink-muted">{step.text}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}