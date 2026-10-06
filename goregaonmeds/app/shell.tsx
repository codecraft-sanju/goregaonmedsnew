"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { MotionConfig, motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Pill,
  Route,
  UserRound,
  MapPin,
  ArrowUpRight,
  Cross,
  ShoppingBag,
  UsersRound,
  ChartNoAxesCombined,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { api, cn, type Settings } from "@/lib/api";
const SettingsContext = createContext<{
  settings: Settings | null;
  refresh: () => void;
}>({ settings: null, refresh: () => {} });
export const useSettings = () => useContext(SettingsContext);
const publicNav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/order", label: "Order", icon: Pill },
  { href: "/track", label: "Track", icon: Route },
  { href: "/profile", label: "My space", icon: UserRound },
];
const adminNav = [
  { href: "/admin", label: "Orders", icon: ShoppingBag },
  { href: "/admin/customers", label: "Customers", icon: UsersRound },
  { href: "/admin/analytics", label: "Insights", icon: ChartNoAxesCombined },
  { href: "/admin/settings", label: "Settings", icon: Settings2 },
];
export function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 font-semibold tracking-tight"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-brand text-white">
        <Cross size={20} strokeWidth={2.8} />
      </span>
      <span>
        Goregaon<span className="text-brand">Meds</span>
        <span className="block text-[9px] font-semibold uppercase tracking-[.19em] text-muted">
          Your neighbourhood pharmacy
        </span>
      </span>
    </Link>
  );
}
export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const admin = path.startsWith("/admin");
  const login = path === "/admin/login";
  const [settings, setSettings] = useState<Settings | null>(null);
  const [revision, update] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    api<{ settings: Settings }>("/settings/public", { signal: c.signal })
      .then((d) => setSettings(d.settings))
      .catch(() => {});
    return () => c.abort();
  }, [revision]);
  const nav = admin ? adminNav : publicNav;
  function links(mobile = false) {
    return nav.map(({ href, label, icon: Icon }) => {
      const active =
        href === "/" || href === "/admin"
          ? path === href
          : path.startsWith(href);
      return (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "nav-item",
            mobile ? "flex-1 flex-col gap-1 px-1 py-2 text-[10px]" : "",
            active ? "bg-mint/80 text-brand" : "text-muted",
          )}
        >
          <Icon size={mobile ? 21 : 19} />
          <span>{label}</span>
          {active && !mobile && (
            <motion.span
              layoutId="sidebar-dot"
              className="ml-auto size-1.5 rounded-full bg-brand"
            />
          )}
        </Link>
      );
    });
  }
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ type: "spring", stiffness: 340, damping: 32 }}
    >
      <SettingsContext.Provider
        value={{ settings, refresh: () => update((n) => n + 1) }}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:p-4"
        >
          Skip to content
        </a>
        <div className="pointer-events-none fixed -left-28 -top-40 -z-10 size-[550px] rounded-full bg-mint/80 blur-[120px]" />
        {!login && (
          <aside className="fixed inset-y-5 left-5 z-30 hidden w-60 flex-col rounded-[30px] border border-white bg-white/70 p-5 shadow-soft backdrop-blur-xl lg:flex">
            <Brand />
            <p className="eyebrow mb-3 mt-12">
              {admin ? "Pharmacy workspace" : "A little care, every day"}
            </p>
            <nav aria-label="Main navigation" className="space-y-2">
              {links()}
            </nav>
            <div className="mt-auto rounded-3xl bg-brand p-5 text-white">
              <ShieldCheck className="mb-3" />
              <p className="font-semibold">Care, closer to home.</p>
              <p className="mt-2 text-xs leading-relaxed text-white/70">
                Your medicine list. Your local pharmacy. One simple connection.
              </p>
            </div>
            <Link
              href={admin ? "/" : "/admin/login"}
              className="mt-5 flex items-center justify-between px-2 text-xs text-muted"
            >
              {admin ? "Visit storefront" : "Pharmacy login"}
              <ArrowUpRight size={15} />
            </Link>
          </aside>
        )}
        <div className={cn(!login && "lg:pl-[280px]")}>
          <header className="sticky top-0 z-20 border-b border-white/70 bg-paper/85 px-5 py-4 backdrop-blur-xl sm:px-9">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
              <div className="lg:hidden">
                <Brand />
              </div>
              <div className="hidden text-sm font-medium lg:block">
                {admin
                  ? "Pharmacy workspace"
                  : "Made for your everyday wellbeing"}
              </div>
              <span className="flex items-center gap-1.5 rounded-full border border-brand/10 bg-white/80 px-3 py-2 text-[11px] font-medium text-brand">
                <MapPin size={14} />
                <span>{admin ? "Admin" : "Goregaon East"}</span>
              </span>
            </div>
          </header>
          <main
            id="main"
            tabIndex={-1}
            className="mx-auto min-h-[80vh] max-w-6xl px-5 pb-32 pt-7 outline-none sm:px-9 sm:pt-10 lg:pb-12"
          >
            {children}
          </main>
          <footer className="no-print mx-auto hidden max-w-6xl items-center justify-between px-9 pb-8 text-xs text-muted lg:flex">
            <span>GoregaonMeds · Local care, thoughtfully delivered.</span>
            <Link href={admin ? "/" : "/admin/login"}>
              {admin ? "Back to store" : "Pharmacy workspace"} →
            </Link>
          </footer>
        </div>
        {!login && (
          <nav
            aria-label="Mobile navigation"
            className="fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-lg gap-1 rounded-[25px] border border-white/80 bg-white/90 p-2 pb-[max(8px,env(safe-area-inset-bottom))] shadow-[0_8px_50px_-10px_#15625344] backdrop-blur-xl lg:hidden"
          >
            {links(true)}
          </nav>
        )}
      </SettingsContext.Provider>
    </MotionConfig>
  );
}
export function PageTransition({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={path}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
