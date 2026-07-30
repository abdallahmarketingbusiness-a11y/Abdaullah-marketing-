import './globals.css'

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
    <html lang="ar">
      <body>{children}</body>
    </html>
  )
}
