/** @type {import('next').NextConfig} */
const scriptPolicy = process.env.NODE_ENV === 'development'
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'"

const nextConfig = {
  // Browser tests use an isolated build directory so a developer preview and
  // the production-like E2E server can run without corrupting each other's
  // manifests and route chunks.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; ${scriptPolicy}; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
    ] }]
  },
}
module.exports = nextConfig
