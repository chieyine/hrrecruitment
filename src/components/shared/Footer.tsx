import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-[#385847] bg-[#173426] text-[#dbe5dd]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="max-w-md">
            <p className="font-display text-3xl tracking-[-0.03em] text-white">FRAD</p>
            <p className="mt-3 text-sm leading-6 text-[#b8c9bd]">
              Find a role, submit an application and complete any actions requested by the recruitment team.
            </p>
            <p className="mt-5 border-l-2 border-[#d4875f] pl-4 text-xs leading-5 text-[#dbe5dd]">
              FRAD never asks candidates to pay a recruitment fee.
            </p>
          </div>

          <div>
            <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#91aa99]">For candidates</h2>
            <ul className="space-y-3 text-sm">
              <li><Link href="/careers" className="hover:text-white">Open vacancies</Link></li>
              <li><Link href="/recruitment-process" className="hover:text-white">How recruitment works</Link></li>
              <li><Link href="/recruitment-faq" className="hover:text-white">Help and common questions</Link></li>
              <li><Link href="/complaints" className="hover:text-white">Raise a concern</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#91aa99]">Important</h2>
            <ul className="space-y-3 text-sm">
              <li><Link href="/privacy" className="hover:text-white">Privacy notice</Link></li>
              <li><Link href="/terms" className="hover:text-white">Terms of use</Link></li>
              <li>
                <Link href="/report-fraud" className="inline-flex items-center gap-1.5 text-[#f0b393] hover:text-white">
                  Report recruitment fraud <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col justify-between gap-2 border-t border-[#385847] pt-6 text-[11px] text-[#91aa99] sm:flex-row">
          <p>© {new Date().getFullYear()} FRAD. All rights reserved.</p>
          <p>For help with an application, sign in and send the recruitment team a message.</p>
        </div>
      </div>
    </footer>
  )
}
