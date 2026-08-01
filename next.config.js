/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  images: {
    // بيسمح لـ next/image إنه يتعامل مع الصور المرفوعة على Supabase Storage
    // (مش بس الصور المحلية في /public) عشان يقدر يصغّرها ويحوّلها WebP/AVIF أوتوماتيك.
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        // cache static images from /public for a year (they're fingerprint-free,
        // so keep this conservative — bump the filename if you ever replace an image)
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/:path*(jpg|jpeg|png|webp|avif|svg|gif|ico)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
    ]
  },
}
module.exports = nextConfig
