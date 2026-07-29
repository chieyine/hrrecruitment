/** @type {import('next').NextConfig} */
// Next.js emits inline bootstrap scripts. `strict-dynamic` cannot be enabled
// here without per-request nonces: browsers would then ignore `'self'` and
// block both those bootstraps and every framework chunk.
const scriptPolicy =
  process.env.NODE_ENV === 'development'
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'"

const nextConfig = {
  // Browser tests use an isolated build directory so a developer preview and
  // the production-like E2E server can run without corrupting each other's
  // manifests and route chunks.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Produces .next/standalone, which the Docker runtime stage copies instead of
  // the entire build tree.
  output: process.env.NEXT_OUTPUT_STANDALONE === 'false' ? undefined : 'standalone',
  poweredByHeader: false,
  async redirects() {
    return [
      { source: '/recruitment-process', destination: '/guidance', permanent: true },
      { source: '/report-recruitment-fraud', destination: '/report-fraud', permanent: true },
      { source: '/login', destination: '/auth/login', permanent: true },
      { source: '/register', destination: '/auth/register', permanent: true },
      { source: '/candidate/assessments', destination: '/candidate/tasks', permanent: true },
      { source: '/candidate/offers', destination: '/candidate/applications', permanent: true },
      {
        source: '/recruitment/vacancies/:id/applications',
        destination: '/recruitment/applications?vacancyId=:id',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; ${scriptPolicy}; connect-src 'self'; font-src 'self' data:; frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
          },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
      {
        // Authenticated PDF files may be displayed by the platform's own
        // controlled-document viewer. They remain blocked from other origins.
        source: '/api/assets/download/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "default-src 'none'; frame-ancestors 'self'; sandbox" },
        ],
      },
    ]
  },
}
module.exports = nextConfig
