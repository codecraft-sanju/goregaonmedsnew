// goregaonmeds-frontend/next.config.ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'export',
  trailingSlash: process.env.NEXT_TRAILING_SLASH === 'true',
  images: { unoptimized: true },
  devIndicators: false,
};

export default config;