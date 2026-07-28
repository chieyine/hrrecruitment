import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import type { UserSession } from '@/lib/auth'

export type LegalSection = { title: string; paragraphs: string[] }

export default function LegalDocument({
  user,
  eyebrow,
  title,
  summary,
  version,
  sections,
}: {
  user?: UserSession | null
  eyebrow: string
  title: string
  summary: string
  version: string
  sections: LegalSection[]
}) {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <header className="border-b border-stone-300 pb-8">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700">{eyebrow}</p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.03em] text-stone-950 sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">{summary}</p>
            <p className="mt-5 text-xs font-semibold text-stone-500">{version}</p>
          </header>
          <article className="divide-y divide-stone-200">
            {sections.map((section, index) => (
              <section key={section.title} className="grid gap-3 py-7 sm:grid-cols-[48px_1fr]">
                <p aria-hidden="true" className="font-mono text-xs font-bold text-brand-700">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">{section.title}</h2>
                  <div className="mt-3 space-y-3">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="text-sm leading-7 text-stone-600">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </article>
        </div>
      </main>
      <Footer />
    </div>
  )
}
