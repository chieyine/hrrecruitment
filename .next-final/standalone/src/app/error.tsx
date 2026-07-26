'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, RotateCcw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface to the console; a real deployment would forward to its monitor.
    console.error('Route error:', error)
  }, [error])

  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center bg-[#f4f1ea] px-4 py-16">
      <div className="w-full max-w-xl border-t-2 border-[#173426] bg-[#f8f6f1] p-8 text-left shadow-[0_24px_70px_rgba(23,52,38,0.10)] sm:p-12">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9a4f2e]">Temporary application error</p>
        <h1 className="mt-4 font-display text-4xl text-[#17211c]">We could not load this page.</h1>
        <p className="mt-4 text-sm leading-6 text-[#526158]">
          Your saved account information has not been changed. Try loading the page again; if the problem continues, return to the careers homepage.
        </p>
        {error.digest && <p className="mt-4 font-mono text-[11px] text-[#7c897f]">Reference: {error.digest}</p>}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={reset}
            className="btn-primary inline-flex px-5 py-3"
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Try again
          </button>
          <Link
            href="/"
            className="btn-secondary inline-flex px-5 py-3"
          >
            Go to homepage <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  )
}
