/** @type {import('next').NextConfig} */
const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: cloudName ? `/${cloudName}/**` : '/**' },
    ],
  },
  // The browser only talks to /api on this origin. Proxying keeps the admin cookie first-party,
  // so it can stay HttpOnly + SameSite=Strict without CORS credentials.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
