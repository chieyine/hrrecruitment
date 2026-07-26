import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toaster'

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'localhost:3000'
  const protocol = requestHeaders.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')
  let metadataBase: URL
  try {
    metadataBase = new URL(`${protocol}://${host}`)
  } catch {
    metadataBase = new URL('http://localhost:3000')
  }

  return {
    metadataBase,
    title: {
      default: 'Careers at FRAD',
      template: '%s · FRAD Careers',
    },
    description: 'Current vacancies and secure candidate services for FRAD.',
    openGraph: {
      title: 'Careers at FRAD',
      description: 'Current vacancies and candidate services',
      type: 'website',
      images: [{ url: '/og.png', width: 1731, height: 909, alt: 'Careers at FRAD' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Careers at FRAD',
      description: 'Current vacancies and candidate services',
      images: ['/og.png'],
    },
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface-50 font-sans text-navy-800 antialiased selection:bg-brand-200 selection:text-navy-900">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
        >
          Skip to main content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
