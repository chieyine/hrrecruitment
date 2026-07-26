'use client'

import { Printer } from 'lucide-react'

export default function PrintButton({ label = 'Print or save as PDF' }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-secondary print:hidden">
      <Printer className="mr-2 h-4 w-4" /> {label}
    </button>
  )
}
