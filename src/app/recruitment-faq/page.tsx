import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { ArrowRight } from 'lucide-react'
import { getVerifiedUser } from '@/lib/auth'

export default async function FAQPage() {
  const user = await getVerifiedUser()
  const isCandidate = Boolean(user?.roles.includes('CANDIDATE'))
  const helpHref = isCandidate ? '/candidate/messages' : user ? '/recruitment/dashboard' : '/auth/login?next=/candidate/messages'
  const faqs = [
    {
      question: 'Does FRAD charge recruitment fees?',
      answer:
        'No. You will never be asked to pay to apply, take an assessment, attend an interview or receive an offer. If someone asks you for money, stop communicating with them and report it to FRAD.',
    },
    {
      question: 'Can I apply for multiple open vacancies at the same time?',
      answer:
        'Yes. Your profile can support more than one application, but your answers should address the requirements of each role.',
    },
    {
      question: 'Does saving a draft submit my application?',
      answer:
        'No. A draft stays in your account until you review and submit it. Your dashboard clearly labels drafts, and you will receive a submission receipt when an application is received.',
    },
    {
      question: 'Can I change an application after I submit it?',
      answer:
        'No. Submission creates a fixed record of your profile, answers and selected documents. You can update your reusable profile for future applications or withdraw the submitted application.',
    },
    {
      question: 'When will I hear back?',
      answer:
        'Timelines depend on the vacancy and number of applications. Check your account for the latest status. FRAD will contact you if you need to complete an assessment, attend an interview or provide more information.',
    },
    {
      question: 'I need an adjustment for an assessment or interview. What should I do?',
      answer:
        'Sign in and submit a reasonable-adjustment request as early as possible. Tell us what would help you take part. Requesting an adjustment does not disadvantage your application.',
    },
    {
      question: 'How do candidate references work?',
      answer:
        'If references are required, FRAD sends a time-limited, single-use link to the referees you nominated. They do not need an account and cannot see your application.',
    },
    {
      question: 'What happens after I accept an offer?',
      answer:
        'Your candidate account will show the forms, documents and orientation tasks required before your start date.',
    },
    {
      question: 'I cannot sign in or upload a document. Where can I get help?',
      answer:
        'Use password recovery if you cannot sign in. For an upload problem, check the allowed file type and size shown beside the field. If the problem continues, send a message from your candidate account and include the page, time and error message.',
    },
    {
      question: 'How do I withdraw an application or close my account?',
      answer:
        'Open the submitted application to withdraw it. To request account closure, open Settings in your candidate account. Some records may still be kept where FRAD has a legal duty to retain them.',
    },
  ]

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[340px_1fr]">
          <aside>
            <span className="editorial-kicker">Candidate help</span>
            <h1 className="editorial-title mt-5 text-5xl text-[#17211c]">Help with your application</h1>
            <p className="mt-5 text-sm leading-6 text-[#617067]">
              Straight answers about applications, deadlines, adjustments, references and account access.
            </p>
            <div className="mt-8 border-l-2 border-[#d4875f] pl-4">
              <p className="text-sm font-bold text-[#17211c]">Still need help?</p>
              <Link
                href={helpHref}
                className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-brand-800"
              >
                {isCandidate ? 'Message the recruitment team' : user ? 'Return to recruitment' : 'Sign in to send a message'}{' '}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </aside>

          <div>
            <div className="divide-y divide-[#d9d4ca] border-y border-[#d9d4ca]">
              {faqs.map((faq, index) => (
                <section
                  key={faq.question}
                  className="grid gap-3 bg-[#f8f6f1] px-5 py-7 sm:grid-cols-[42px_1fr] sm:px-7"
                >
                  <span className="font-display text-xl text-[#9a4f2e]">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h2 className="font-display text-2xl text-[#17211c]">{faq.question}</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5b6860]">{faq.answer}</p>
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-10 bg-brand-900 p-7 text-white sm:flex sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-2xl">Asked to pay for a job?</h2>
                <p className="mt-2 text-sm text-brand-100">
                  Do not send money. Keep the message and report it to FRAD.
                </p>
              </div>
              <Link
                href="/report-fraud"
                className="mt-5 inline-flex items-center gap-2 bg-white px-4 py-3 text-xs font-bold text-brand-950 sm:mt-0"
              >
                Report fraud <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
