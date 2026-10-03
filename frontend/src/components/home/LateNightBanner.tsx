'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { isLateNightInMumbai } from '@/lib/format';

/** Rendered only on the client, from 10 PM to 6 AM IST, to avoid a hydration mismatch. */
export function LateNightBanner() {
  const [lateNight, setLateNight] = useState(false);

  useEffect(() => {
    const update = () => setLateNight(isLateNightInMumbai());
    update();
    const timer = setInterval(update, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  if (!lateNight) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-brand-950 text-brand-50" role="note">
      <p className="container-app py-2.5 text-center text-sm">
        🌙 <strong>Ordering late?</strong> Healthzone &amp; Cosmetic is Open 24x7. You can still place your medicine request now.
      </p>
    </motion.div>
  );
}
