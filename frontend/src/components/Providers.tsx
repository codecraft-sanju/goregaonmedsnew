'use client';

import type { ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { ToastProvider } from './ui/Toast';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>{children}</ToastProvider>
    </MotionConfig>
  );
}
