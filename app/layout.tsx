import type { Metadata } from 'next'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import BackToTop from '@/components/BackToTop'
import { BASE, SITE_NAME, SITE_TAGLINE } from '@/lib/site'
import './globals.css'

const AD_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

export const metadata: Metadata = {
  openGraph: { images: ["/og.png"] },
  metadataBase: new URL(BASE),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: `${SITE_TAGLINE}. Average salaries, hourly wages, and employment for hundreds of occupations in all 50 states — straight from official BLS data, no estimates we made up.`,
  applicationName: SITE_NAME,
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-ink antialiased">
        <a href="#main" className="skip-link">Skip to content</a>
        <Nav />
        <main id="main" className="mx-auto w-full max-w-4xl px-5 pb-16 pt-10">{children}</main>
        <Footer />
        <BackToTop />
        <Analytics />
        {AD_CLIENT ? (
          <Script id="adsbygoogle-init" async strategy="afterInteractive" crossOrigin="anonymous" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`} />
        ) : null}
      </body>
    </html>
  )
}
