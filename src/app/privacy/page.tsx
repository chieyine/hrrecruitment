import LegalDocument from '@/components/shared/LegalDocument'
import { getVerifiedUser } from '@/lib/auth'

const sections = [
  {
    title: 'Information we collect',
    paragraphs: [
      'We collect the information needed to assess your application and, if you are appointed, prepare you to start work. This can include your contact details, education, work history, licences, application answers, identity documents, references and preboarding information.',
      'Some preboarding forms contain more sensitive information, such as bank, pension, medical, accessibility or next-of-kin details. Access to those records is restricted.',
      'We also record sign-ins, security events, downloads, browser or device information and relevant network addresses where needed to protect accounts and investigate misuse.',
    ],
  },
  {
    title: 'How we use your information',
    paragraphs: [
      'We use your information to manage applications, assess suitability, arrange assessments and interviews, obtain references, issue offers, complete preboarding and prepare an approved handover to FRAD’s personnel system.',
      'Final recruitment decisions are made by people. A successful candidate is transferred to FRAD’s personnel system only after the required approval and readiness checks.',
    ],
  },
  {
    title: 'Your reusable profile',
    paragraphs: [
      'Your profile can be used for more than one FRAD vacancy. When you submit an application, we keep a fixed copy of the profile, answers and documents used for that application. Later profile changes do not rewrite an earlier application.',
    ],
  },
  {
    title: 'Who can see your information',
    paragraphs: [
      'Access depends on a person’s role and assignment. Recruitment staff can see records needed to run the process. Hiring managers and panel members see only the vacancies, applications or interviews assigned to them. Authorized HR staff can see restricted preboarding records when their work requires it.',
      'A referee receives a time-limited, single-use link and cannot see your application or account.',
      'FRAD may use approved service providers for hosting, file storage and message delivery. They may process information only to provide those services under FRAD’s instructions. FRAD does not sell candidate information.',
    ],
  },
  {
    title: 'How long we keep it',
    paragraphs: [
      'Retention periods differ for drafts, unsuccessful applications, successful appointments, references, identity documents, financial records and audit evidence. FRAD applies approved retention rules and may keep limited evidence where the law, an investigation or a legal hold requires it.',
    ],
  },
  {
    title: 'How we protect it',
    paragraphs: [
      'Files are stored privately, checked for malware and provided through time-limited download links. Sensitive actions and downloads are recorded. Access is reviewed and removed when it is no longer needed.',
    ],
  },
  {
    title: 'Your choices',
    paragraphs: [
      'You can correct your profile, withdraw an active application and request account closure from your account. You may also ask FRAD to explain, correct or review the use of your information.',
      'Withdrawing consent needed for recruitment stops further processing, but it does not remove information that FRAD must retain by law or for an active investigation.',
    ],
  },
  {
    title: 'Questions or requests',
    paragraphs: [
      'Use the secure messaging or concern service in this portal for questions about your recruitment record. Never send your password, sign-in code or a one-time reference link by email.',
    ],
  },
]

export default async function PrivacyPage() {
  const user = await getVerifiedUser()
  return (
    <LegalDocument
      user={user}
      eyebrow="Candidate information"
      title="Privacy notice"
      summary="This notice explains what FRAD collects during recruitment, why we need it, who can see it and the choices available to you."
      version="Version 2026-07 · Effective 22 July 2026"
      sections={sections}
    />
  )
}
