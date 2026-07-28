'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, LockKeyhole } from 'lucide-react'

export default function Footer() {
  const pathname = usePathname()
  const isWorkspace =
    pathname.startsWith('/recruitment') || pathname.startsWith('/admin') || pathname.startsWith('/candidate')
  const workspaceLabel = pathname.startsWith('/candidate')
    ? 'Candidate portal'
    : pathname.startsWith('/admin')
      ? 'Recruitment administration'
      : 'Recruitment workspace'

  if (isWorkspace) {
    return (
      <footer className="border-t border-stone-200 bg-white/80">
        <div className="page-shell flex flex-col justify-between gap-3 py-5 text-[11px] text-stone-500 sm:flex-row sm:items-center">
          <p className="flex items-center gap-2 font-semibold text-stone-600">
            <LockKeyhole className="h-3.5 w-3.5 text-brand-700" />
            FRAD Foundation · {workspaceLabel}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:text-brand-800">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-brand-800">
              Terms
            </Link>
            <Link
              href={pathname.startsWith('/candidate') ? '/candidate/messages' : '/recruitment/communications'}
              className="hover:text-brand-800"
            >
              Support
            </Link>
            <span>© {new Date().getFullYear()} FRAD Foundation</span>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="border-t border-[#335241] bg-[#102c20] text-[#dce6df]">
      <div className="page-shell py-12">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="max-w-md">
            <p className="text-sm font-bold tracking-[-0.01em] text-white">FRAD Foundation</p>
            <p className="mt-4 font-display text-3xl leading-tight text-white">Work that stays close to people.</p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[#b7c9bd]">
              Explore current roles and manage every step of your application through the official FRAD recruitment
              service.
            </p>
            <p className="mt-6 border-l-2 border-[#d17a56] pl-4 text-xs leading-5 text-[#dce6df]">
              We do not charge candidates at any stage of recruitment.
            </p>
          </div>

          <div>
            <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8faa98]">Candidates</h2>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/careers" className="hover:text-white">
                  Open roles
                </Link>
              </li>
              <li>
                <Link href="/guidance" className="hover:text-white">
                  Our hiring process
                </Link>
              </li>
              <li>
                <Link href="/recruitment-faq" className="hover:text-white">
                  Candidate help
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-white">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8faa98]">Trust and safety</h2>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-white">
                  Privacy notice
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white">
                  Terms of use
                </Link>
              </li>
              <li>
                <Link href="/complaints" className="hover:text-white">
                  Raise a concern
                </Link>
              </li>
              <li>
                <Link href="/report-fraud" className="inline-flex items-center gap-1.5 text-[#efaa8b] hover:text-white">
                  Report recruitment fraud <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col justify-between gap-2 border-t border-[#335241] pt-6 text-[11px] text-[#8faa98] sm:flex-row">
          <p>© {new Date().getFullYear()} FRAD Foundation. All rights reserved.</p>
          <p>Official recruitment service · Secure candidate access</p>
        </div>
      </div>
    </footer>
  )
}
