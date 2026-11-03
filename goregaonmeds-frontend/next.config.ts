//goregaonmeds-frontend/next.config.ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  trailingSlash: process.env.NEXT_TRAILING_SLASH === 'true',
  images: { unoptimized: true },
  devIndicators: false,
  
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://32.236.167.30:8000/api/:path*' // EC2 IP
      }
    ];
  }
};

export default config;