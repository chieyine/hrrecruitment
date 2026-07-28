import LegalDocument from '@/components/shared/LegalDocument'
import { getVerifiedUser } from '@/lib/auth'

const sections = [
  {
    title: 'Use your own account',
    paragraphs: [
      'Keep your password private and tell FRAD if you believe someone else has accessed your account. Do not share assessment links, offer documents or one-time reference links.',
    ],
  },
  {
    title: 'Provide accurate information',
    paragraphs: [
      'Your profile, application answers and documents must be truthful and belong to you. FRAD may verify the information you provide. Material falsehoods or fraudulent documents can lead to disqualification, withdrawal of an offer or dismissal.',
    ],
  },
  {
    title: 'Meet published deadlines',
    paragraphs: [
      'Submit applications and requested actions by the time shown in the portal. Saving a draft does not submit an application. FRAD may be unable to accept late applications unless an authorized adjustment or extension has been recorded.',
    ],
  },
  {
    title: 'Assessments and interviews',
    paragraphs: [
      'Complete assessments yourself unless the instructions expressly allow collaboration. Do not record or distribute interview questions, assessment content or confidential recruitment material.',
      'If you need a reasonable adjustment, request it as early as you can. Asking for an adjustment does not disadvantage your application.',
    ],
  },
  {
    title: 'There are no recruitment fees',
    paragraphs: [
      'FRAD does not charge candidates to apply, take an assessment, attend an interview or receive an offer. Do not pay anyone who claims they can secure a FRAD role. Keep the evidence and report it through the fraud form.',
    ],
  },
  {
    title: 'Availability and changes',
    paragraphs: [
      'FRAD may close the portal briefly for maintenance or security work. Important changes to these terms will be dated and published here. Continued use after a change means the new terms apply to later activity.',
    ],
  },
  {
    title: 'Questions and concerns',
    paragraphs: [
      'Use the candidate help pages for routine questions. Use the concern service if you need to raise a complaint, appeal, safeguarding matter, privacy issue or suspected fraud.',
    ],
  },
]

export default async function TermsPage() {
  const user = await getVerifiedUser()
  return (
    <LegalDocument
      user={user}
      eyebrow="Using this service"
      title="Terms of use"
      summary="These terms set out what FRAD expects when you use the recruitment and preboarding service."
      version="Version 2026-07 · Effective 22 July 2026"
      sections={sections}
    />
  )
}
