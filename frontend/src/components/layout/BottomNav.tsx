'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { Home, MapPin, ShoppingBag, User } from 'lucide-react';
import styles from '../home/HomeExperience.module.css';

const items = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/order', label: 'Order', icon: ShoppingBag },
  { href: '/track', label: 'Track', icon: MapPin },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  return <div className={styles.bottomSpace}>
    <LayoutGroup id="gm-mobile-tabs">
      <nav className={styles.bottomNav} aria-label="Primary mobile navigation">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
          return <Link href={href} key={href} className={styles.tab} aria-current={active ? 'page' : undefined}>
            <motion.span className={styles.tabContent} whileTap={reduced ? undefined : { scale: 0.95 }}>
              <span className={styles.tabIcon}>
                {active && <motion.span className={styles.activeTab} layoutId="active-tab"
                  transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 36 }} />}
                <Icon size={21} strokeWidth={active ? 2.3 : 1.7} aria-hidden />
              </span>
              <span>{label}</span>
            </motion.span>
          </Link>;
        })}
      </nav>
    </LayoutGroup>
  </div>;
}
