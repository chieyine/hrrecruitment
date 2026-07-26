/** @type {import('next').NextConfig} */
// Next.js emits inline bootstrap scripts. `strict-dynamic` cannot be enabled
// here without per-request nonces: browsers would then ignore `'self'` and
// block both those bootstraps and every framework chunk.
const scriptPolicy = process.env.NODE_ENV === 'development'
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
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'X-DNS-Prefetch-Control', value: 'off' },
      { key: 'Content-Security-Policy', value: `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; ${scriptPolicy}; connect-src 'self'; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
    ] }]
  },
}
module.exports = nextConfig
