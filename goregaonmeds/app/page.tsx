"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowRight,
  FileText,
  Pill,
  Route,
  Gift,
  ShieldCheck,
  Wallet,
  HeartHandshake,
  Plus,
  Sparkles,
} from "lucide-react";
import { useSettings } from "./shell";
import { money } from "@/lib/api";
export default function HomePage() {
  const { settings } = useSettings();
  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow mb-3">Your everyday care companion</p>
          <h1 className="title">
            Namaste <span className="inline-block text-2xl">☀</span>
            <br className="sm:hidden" /> What do you need today?
          </h1>
        </div>
        <span className="hidden rounded-full bg-mint px-4 py-2 text-xs font-medium text-brand sm:block">
          Local pharmacy. Personal care.
        </span>
      </div>
      <section className="relative overflow-hidden rounded-[32px] bg-brand px-6 py-9 text-white sm:px-9 sm:py-12">
        <div className="absolute -right-16 -top-28 size-96 rounded-full border-[45px] border-white/5" />
        <div className="absolute -bottom-28 right-10 size-72 rounded-full border-[40px] border-white/5" />
        <div className="relative z-10 max-w-lg">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest">
            <HeartHandshake size={14} /> A healthier day starts here
          </span>
          <h2 className="text-[40px] font-semibold leading-[1.08] tracking-[-.055em] sm:text-6xl">
            Your medicines.
            <br />
            <span className="text-[#b9e2cb]">A little closer.</span>
          </h2>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/75">
            Send your prescription or medicine list. Your neighbourhood pharmacy
            takes care of the rest.
          </p>
          <Link
            href="/order"
            className="mt-7 inline-flex min-h-12 items-center gap-6 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-brand transition hover:bg-mint active:scale-95"
          >
            Start an order <ArrowUpRight size={19} />
          </Link>
        </div>
        <div
          aria-hidden="true"
          className="absolute bottom-12 right-12 hidden rotate-[-12deg] rounded-[38px] border border-white/20 bg-white/10 p-8 backdrop-blur sm:block"
        >
          <Pill size={110} strokeWidth={0.8} />
          <div className="absolute -right-5 -top-5 grid size-14 place-items-center rounded-2xl bg-[#d8f3e8] text-brand">
            <Plus size={27} />
          </div>
        </div>
      </section>
      <section
        className="grid grid-cols-3 gap-3 sm:gap-5"
        aria-label="Quick actions"
      >
        {[
          {
            title: "Upload prescription",
            sub: "A photo is all it takes",
            href: "/order?mode=prescription",
            icon: FileText,
            color: "bg-mint text-brand",
          },
          {
            title: "Add medicines",
            sub: "Send your medicine list",
            href: "/order",
            icon: Pill,
            color: "bg-[#e9edf9] text-[#516093]",
          },
          {
            title: "Track order",
            sub: "Stay in the loop",
            href: "/track",
            icon: Route,
            color: "bg-[#f8eee2] text-[#967349]",
          },
        ].map(({ title, sub, href, icon: Icon, color }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Link
              href={href}
              className="group flex h-full flex-col rounded-[25px] border border-white bg-white p-4 shadow-soft transition hover:-translate-y-1 sm:p-6"
            >
              <span
                className={`mb-4 grid size-12 place-items-center rounded-2xl ${color}`}
              >
                <Icon size={24} />
              </span>
              <h3 className="text-sm font-semibold leading-snug sm:text-lg">
                {title}
              </h3>
              <p className="muted mt-1 hidden sm:block">{sub}</p>
              <ArrowUpRight
                className="mt-4 text-muted transition group-hover:translate-x-1"
                size={18}
              />
            </Link>
          </motion.div>
        ))}
      </section>
      {settings?.firstOrderOfferEnabled && (
        <section className="relative flex flex-col gap-5 overflow-hidden rounded-[28px] border border-amber-200/70 bg-[#fff4df] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/70 text-amber-700">
              <Gift size={25} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800">
                A welcome gift for your first order
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                A little extra care. On us.
              </h2>
              <p className="mt-2 max-w-lg text-xs leading-relaxed text-amber-950/70">
                Free Dr. Morepen GlucoOne BG-03 on an eligible first medicine
                order of {money(settings.firstOrderMinimumMedicineAmount)} or
                more. One gift per customer; non-medicine products excluded.
                Eligibility confirmed by the pharmacy.
              </p>
            </div>
          </div>
          <Link
            href="/order"
            className="flex shrink-0 items-center gap-3 text-sm font-semibold text-amber-900"
          >
            Explore offer <ArrowRight size={17} />
          </Link>
        </section>
      )}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            Simple steps. Thoughtful care.
          </h2>
          <Sparkles size={20} className="text-brand" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              n: "01",
              title: "Tell us what you need",
              text: "Upload a clear prescription or add medicines with their quantities.",
              icon: FileText,
            },
            {
              n: "02",
              title: "We confirm your order",
              text: "The pharmacy reviews your list, availability and final bill.",
              icon: ShieldCheck,
            },
            {
              n: "03",
              title: "Pay when it arrives",
              text: "Cash or UPI at delivery. Check your order details anytime.",
              icon: Wallet,
            },
          ].map(({ n, title, text, icon: Icon }) => (
            <div key={n} className="card">
              <div className="mb-5 flex justify-between text-brand">
                <Icon size={23} />
                <span className="text-xs text-muted">{n}</span>
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="muted mt-2">{text}</p>
            </div>
          ))}
        </div>
      </section>
      <p className="text-center text-xs text-muted">
        Delivery:{" "}
        {settings
          ? settings.deliveryCharge === 0
            ? "FREE"
            : money(settings.deliveryCharge)
          : "Confirmed by pharmacy"}{" "}
        · Goregaon East
      </p>
    </div>
  );
}
