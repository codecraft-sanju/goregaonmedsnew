// src/components/home/Hero.tsx
export function Hero() {
  return (
    <section className="container-app pt-6 pb-2 md:pt-10">
      <h1 className="font-display text-[2rem] font-extrabold leading-[1.15] tracking-tight text-ink sm:text-4xl">
        What do you need today?
      </h1>
      <p className="mt-2 text-sm text-ink-muted sm:text-base">
        Order your medicines quickly and easily.
      </p>
    </section>
  );
}