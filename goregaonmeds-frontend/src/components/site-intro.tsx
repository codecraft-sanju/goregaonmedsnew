//src/components/site-intro.tsx
'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function SiteIntro() {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (reducedMotion) {
      setVisible(false);
      return;
    }

    const previousOverflow = document.body.style.overflow;

    // Lock scrolling only during the intro.
    document.body.style.overflow = 'hidden';

    const exitTimer = window.setTimeout(() => {
      setExiting(true);
    }, 1250);

    const removeTimer = window.setTimeout(() => {
      document.body.style.overflow = previousOverflow;
      setVisible(false);
    }, 1710);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);

      // Always restore scrolling on cleanup/unmount.
      document.body.style.overflow = previousOverflow;
    };
  }, []); // IMPORTANT: Run only on mount.

  if (!visible) return null;

  return (
    <div
      className={`gm-intro${exiting ? ' gm-intro--exit' : ''}`}
      role="status"
      aria-label="Opening GoregaonMeds"
      aria-live="polite"
    >
      <div className="gm-intro__inner">
        <div className="gm-intro__icon">
          <Image
            src="/navbar.png"
            alt=""
            width={88}
            height={88}
            priority
            className="gm-intro__image"
          />
        </div>

        <div className="gm-intro__wordmark" aria-hidden="true">
          <span>goregaon</span>
          <span className="gm-intro__accent">meds</span>
        </div>

        <div className="gm-intro__tagline" aria-hidden="true">
          YOUR NEIGHBOURHOOD. YOUR CARE.
        </div>

        <div className="gm-intro__loading" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
