import './globals.css'
import { Cairo, Cinzel } from 'next/font/google'

// next/font بيحمّل الخط وقت الـ build ويقدمه من نفس السيرفر بتاعك (self-hosted)،
// من غير ما المتصفح يستنى fonts.googleapis.com / fonts.gstatic.com قبل ما يبدأ يعرض النص.
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '600', '700', '900'],
  variable: '--font-cairo',
  display: 'swap',
})
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-cinzel',
  display: 'swap',
})

export const metadata = {
  metadataBase: new URL('https://abdaullah-marketing-3dmf.vercel.app'),
  title: 'Abdullah Marketing',
  description: 'Social Media Marketing',
  openGraph: {
    title: 'Abdullah Marketing',
    description: 'Social Media Marketing',
    url: 'https://abdaullah-marketing-3dmf.vercel.app',
    siteName: 'Abdullah Marketing',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Abdullah Marketing',
      },
    ],
    locale: 'ar_EG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Abdullah Marketing',
    description: 'Social Media Marketing',
    images: ['/og-image.jpg'],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" className={`${cairo.variable} ${cinzel.variable}`}>
      <body>{children}</body>
    </html>
  )
}
