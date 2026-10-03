'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { DEFAULT_PUBLIC_SETTINGS } from '@/lib/constants';
import type { PublicSettings } from '@/lib/types';

let cached: Promise<PublicSettings> | null = null;

function fetchSettings() {
  cached ??= apiRequest<{ settings: PublicSettings }>('/settings/public')
    .then((res) => res.settings)
    .catch((error) => {
      cached = null;
      throw error;
    });
  return cached;
}

/** Shares one request across components; falls back to defaults if the API is unreachable. */
export function usePublicSettings() {
  const [settings, setSettings] = useState<PublicSettings>(DEFAULT_PUBLIC_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchSettings()
      .then((value) => active && setSettings(value))
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { settings, loading };
}
