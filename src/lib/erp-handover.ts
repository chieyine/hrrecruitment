import { prisma } from './prisma'
import { brandedPdf, type BrandedPdfSection } from './simple-pdf'

/**
 * ERP handover (End_to_End.md §19).
 *
 * Transfer is manual by design: the platform does not write to the ERP. What it
 * produces is a single authoritative document containing exactly the §19.2 data
 * set, so the HR team keying it into the ERP has one accurate source and the
 * recruitment file records precisely what was handed over.
 */

/** §19.1 Everything that must be true before a handover pack may be issued. */
export interface TransferReadiness {
  ready: boolean
  blockers: string[]
  warnings: string[]
}

export async function assessTransferReadiness(applicationId: string): Promise<TransferReadiness> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      internalStatus: true,
      offers: {
        where: { status: 'ACCEPTED' },
        orderBy: { acceptedAt: 'desc' },
        take: 1,
        select: { id: true, acceptedAt: true, startDate: true },
      },
      backgroundChecks: { select: { checkType: true, status: true } },
      preboardings: {
        orderBy: { startedAt: 'desc' },
        take: 1,
        select: {
          id: true,
          status: true,
          readinessStatus: true,
          readinessConfirmation: { select: { confirmedAt: true, status: true } },
        },
      },
      resumptionRecord: { select: { id: true, actualStartDate: true } },
      erpTransferRecord: { select: { id: true, approvedAt: true, erpPersonnelNumber: true } },
    },
  })

  const blockers: string[] = []
  const warnings: string[] = []
  if (!application) return { ready: false, blockers: ['Application not found'], warnings }

  // §19.1 trigger conditions
  if (!application.offers.length) blockers.push('An accepted offer is required')
  const preboarding = application.preboardings[0]
  if (!preboarding) blockers.push('Preboarding has not been assigned')
  // §18 clearance is the readiness confirmation an HR manager signs off.
  else if (preboarding.readinessConfirmation?.status !== 'CONFIRMED')
    blockers.push('Pre-employment clearance has not been issued')

  const outstandingChecks = application.backgroundChecks.filter(
    (check) => !['CLEARED', 'WAIVED', 'NOT_APPLICABLE'].includes(check.status)
  )
  if (outstandingChecks.length)
    blockers.push(
      `Mandatory checks outstanding: ${outstandingChecks.map((check) => check.checkType).join(', ')}`
    )

  if (!application.offers[0]?.startDate) blockers.push('A confirmed start date is required')
  if (!application.erpTransferRecord?.approvedAt) blockers.push('HR Manager approval of the transfer is required')

  if (!application.resumptionRecord)
    warnings.push('Actual resumption has not been recorded; the pack will show the planned start date')

  return { ready: blockers.length === 0, blockers, warnings }
}

/** §19.3 A duplicate employee check runs before the pack is issued. */
export async function checkForDuplicateEmployee(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      candidate: {
        select: {
          id: true,
          legalFirstName: true,
          lastName: true,
          primaryPhone: true,
          user: { select: { email: true } },
        },
      },
    },
  })
  if (!application) return { status: 'NOT_RUN' as const, matches: [] }

  const { candidate } = application
  const normalisedPhone = candidate.primaryPhone?.replace(/\D/g, '') || null
  const normalisedEmail = candidate.user.email.trim().toLowerCase()
  const normalisedName = `${candidate.legalFirstName} ${candidate.lastName}`
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

  /**
   * §19.3 Only someone who actually holds an ERP number is an existing
   * employee. A record still awaiting its number is a transfer in flight, not a
   * duplicate — matching against it would flag every candidate twice.
   *
   * The database narrows the candidate set rather than JS: matching in memory
   * over every historical transfer does not survive a few thousand staff.
   */
  const priorTransfers = await prisma.eRPTransferRecord.findMany({
    where: {
      erpPersonnelNumber: { not: null },
      application: {
        candidate: {
          OR: [
            { id: candidate.id },
            { user: { email: normalisedEmail } },
            ...(normalisedPhone ? [{ primaryPhone: { contains: normalisedPhone.slice(-9) } }] : []),
            {
              AND: [
                { legalFirstName: { equals: candidate.legalFirstName, mode: 'insensitive' as const } },
                { lastName: { equals: candidate.lastName, mode: 'insensitive' as const } },
              ],
            },
          ],
        },
      },
    },
    select: {
      erpPersonnelNumber: true,
      createdInErpAt: true,
      application: {
        select: {
          candidate: {
            select: {
              id: true,
              legalFirstName: true,
              lastName: true,
              primaryPhone: true,
              user: { select: { email: true } },
            },
          },
        },
      },
    },
    take: 200,
  })

  /**
   * A shared name is common and is not on its own evidence of a duplicate —
   * flagging on it alone produced so many false positives that the written
   * override became a formality. A name match therefore needs a second signal;
   * identity, email and phone each stand alone.
   */
  const matches = priorTransfers
    .map((record) => {
      const other = record.application.candidate
      const signals: string[] = []

      if (other.id === candidate.id) signals.push('same candidate record')
      if (other.user.email.trim().toLowerCase() === normalisedEmail) signals.push('same email address')

      const otherPhone = other.primaryPhone?.replace(/\D/g, '') || null
      // Compare national significant digits so +234 803… and 0803… agree.
      if (normalisedPhone && otherPhone && normalisedPhone.slice(-9) === otherPhone.slice(-9))
        signals.push('same phone number')

      const otherName = `${other.legalFirstName} ${other.lastName}`.toLowerCase().replace(/\s+/g, ' ').trim()
      const nameMatches = otherName === normalisedName
      if (nameMatches) signals.push('same full name')

      const decisive = signals.some((signal) => signal !== 'same full name')
      return {
        erpPersonnelNumber: record.erpPersonnelNumber as string,
        transferredAt: record.createdInErpAt,
        name: `${other.legalFirstName} ${other.lastName}`.trim(),
        signals,
        // A name-only hit is surfaced for information but does not block.
        decisive,
      }
    })
    .filter((match) => match.signals.length > 0)

  const blocking = matches.filter((match) => match.decisive)
  return {
    status: blocking.length ? ('POSSIBLE_DUPLICATE' as const) : ('CLEAR' as const),
    matches: blocking,
    // Same-name records are shown to the approver as context, not as a blocker.
    nameOnlyMatches: matches.filter((match) => !match.decisive),
  }
}

/** §19.2 The exact data set that transfers. Nothing beyond this leaves recruitment. */
export async function buildTransferDataset(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      referenceNumber: true,
      candidate: {
        select: {
          legalFirstName: true,
          middleName: true,
          lastName: true,
          preferredName: true,
          nationality: true,
          countryOfResidence: true,
          state: true,
          lga: true,
          city: true,
          address: true,
          primaryPhone: true,
          alternatePhone: true,
          user: { select: { email: true } },
        },
      },
      vacancy: {
        select: {
          title: true,
          referenceNumber: true,
          grade: true,
          reportingLine: true,
          contractType: true,
          department: { select: { name: true, code: true } },
          project: { select: { name: true, code: true } },
          dutyStation: { select: { name: true, state: true } },
        },
      },
      offers: {
        where: { status: 'ACCEPTED' },
        orderBy: { acceptedAt: 'desc' },
        take: 1,
        select: {
          position: true,
          proposedGrade: true,
          proposedStep: true,
          salary: true,
          salaryAmount: true,
          salaryCurrency: true,
          salaryPeriod: true,
          budgetLine: true,
          fundingSource: true,
          contractType: true,
          contractDuration: true,
          startDate: true,
          endDate: true,
          reportingLine: true,
          acceptedAt: true,
          signatureName: true,
        },
      },
      resumptionRecord: { select: { actualStartDate: true } },
      preboardings: {
        orderBy: { startedAt: 'desc' },
        take: 1,
        select: {
          readinessConfirmation: { select: { confirmedAt: true, status: true } },
          // §19.2 bank, tax, pension, next-of-kin and emergency contact are
          // collected during preboarding as submitted form answers.
          forms: {
            select: {
              status: true,
              responseJson: true,
              formTemplate: { select: { title: true, handoverPurpose: true } },
            },
          },
        },
      },
      backgroundChecks: { select: { checkType: true, status: true, outcome: true } },
    },
  })
  if (!application) throw new Error('Application not found')

  const offer = application.offers[0]
  const preboarding = application.preboardings[0]

  /**
   * §19.2 Pull a statutory detail from the form explicitly designated to supply
   * it. Matching on `handoverPurpose` rather than on the form title means
   * renaming a form cannot silently empty the handover pack.
   *
   * The three outcomes are distinguished deliberately, because they need
   * different responses from HR:
   *   - `unmapped`  — no form is configured to collect this at all;
   *   - `pending`   — a form exists but the candidate has not submitted it;
   *   - `unreadable`— the stored response is corrupt.
   */
  type StatutoryValue =
    | { state: 'present'; value: Record<string, unknown> }
    | { state: 'unmapped' | 'pending' | 'unreadable' }

  const answersFor = (purpose: string): StatutoryValue => {
    const forms = (preboarding?.forms ?? []).filter((form) => form.formTemplate.handoverPurpose === purpose)
    if (!forms.length) return { state: 'unmapped' }

    const submitted = forms.filter((form) => form.status === 'SUBMITTED' || form.status === 'APPROVED')
    if (!submitted.length) return { state: 'pending' }

    for (const form of submitted) {
      try {
        const parsed = JSON.parse(form.responseJson || '{}')
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length)
          return { state: 'present', value: parsed as Record<string, unknown> }
      } catch {
        return { state: 'unreadable' }
      }
    }
    return { state: 'pending' }
  }

  const candidate = application.candidate
  return {
    recruitmentReference: application.referenceNumber,
    vacancyReference: application.vacancy.referenceNumber,
    personal: {
      fullName: [candidate.legalFirstName, candidate.middleName, candidate.lastName].filter(Boolean).join(' '),
      preferredName: candidate.preferredName,
      email: candidate.user.email,
      primaryPhone: candidate.primaryPhone,
      alternatePhone: candidate.alternatePhone,
      address: [candidate.address, candidate.city, candidate.lga, candidate.state, candidate.countryOfResidence]
        .filter(Boolean)
        .join(', '),
      nationality: candidate.nationality,
    },
    position: {
      department: application.vacancy.department.name,
      position: offer?.position ?? application.vacancy.title,
      grade: offer?.proposedGrade ?? application.vacancy.grade,
      step: offer?.proposedStep ?? null,
      supervisor: offer?.reportingLine ?? application.vacancy.reportingLine,
      dutyStation: `${application.vacancy.dutyStation.name}, ${application.vacancy.dutyStation.state}`,
      contractType: offer?.contractType ?? application.vacancy.contractType,
      contractStart: application.resumptionRecord?.actualStartDate ?? offer?.startDate ?? null,
      contractEnd: offer?.endDate ?? null,
      projectCode: application.vacancy.project?.code ?? null,
    },
    remuneration: {
      salary: offer?.salaryAmount ? `${offer.salaryCurrency} ${offer.salaryAmount.toString()}` : (offer?.salary ?? null),
      period: offer?.salaryPeriod ?? null,
      budgetLine: offer?.budgetLine ?? null,
      fundingSource: offer?.fundingSource ?? null,
    },
    statutory: {
      bank: answersFor('BANK_DETAILS'),
      tax: answersFor('TAX_DETAILS'),
      pension: answersFor('PENSION_DETAILS'),
      emergencyContact: answersFor('EMERGENCY_CONTACT'),
      nextOfKin: answersFor('NEXT_OF_KIN'),
    },
    clearance: {
      clearedAt: preboarding?.readinessConfirmation?.confirmedAt ?? null,
      offerAcceptedAt: offer?.acceptedAt ?? null,
      acceptanceSignature: offer?.signatureName ?? null,
      checks: application.backgroundChecks.map((check) => ({
        type: check.checkType,
        status: check.status,
        outcome: check.outcome,
      })),
    },
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not provided'
  if (value instanceof Date) return value.toLocaleDateString('en-GB')
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== null && item !== undefined && item !== '')
      .map(([key, item]) => `${key.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}: ${String(item)}`)
    return entries.length ? entries.join('; ') : 'Not provided'
  }
  return String(value)
}

/**
 * §19.2 Render a statutory block so a gap is never mistaken for a blank.
 * "Not provided" and "no form is configured to collect this" mean very different
 * things to the person keying the record into the ERP.
 */
function formatStatutory(entry: { state: string; value?: Record<string, unknown> }): string {
  switch (entry.state) {
    case 'present':
      return formatValue(entry.value)
    case 'pending':
      return 'OUTSTANDING - the candidate has not submitted this form'
    case 'unreadable':
      return 'ERROR - the stored response could not be read; check with HR before keying'
    default:
      return 'NOT COLLECTED - no preboarding form is configured to supply this'
  }
}

/** Statutory gaps an approver should see before issuing the pack. */
export function statutoryGaps(dataset: Awaited<ReturnType<typeof buildTransferDataset>>): string[] {
  const labels: Array<[keyof typeof dataset.statutory, string]> = [
    ['bank', 'Bank details'],
    ['tax', 'Tax details'],
    ['pension', 'Pension details'],
    ['emergencyContact', 'Emergency contact'],
    ['nextOfKin', 'Next of kin'],
  ]
  return labels
    .filter(([key]) => dataset.statutory[key].state !== 'present')
    .map(([key, label]) => {
      const state = dataset.statutory[key].state
      if (state === 'unmapped') return `${label}: no preboarding form is configured to collect this`
      if (state === 'unreadable') return `${label}: the stored response could not be read`
      return `${label}: not yet submitted by the candidate`
    })
}

/** §19.3 Render the handover pack. */
export function renderHandoverPdf(input: {
  dataset: Awaited<ReturnType<typeof buildTransferDataset>>
  erpPersonnelNumber: string
  approvedByEmail: string
  approvedAt: Date
  generatedAt: Date
  duplicateCheck: { status: string; matches: Array<{ erpPersonnelNumber: string; name: string }> }
}) {
  const { dataset } = input

  const sections: BrandedPdfSection[] = [
    {
      heading: 'Transfer authorisation',
      rows: [
        ['ERP personnel number', input.erpPersonnelNumber],
        ['Recruitment reference', dataset.recruitmentReference ?? 'Not assigned'],
        ['Vacancy reference', dataset.vacancyReference],
        ['Approved by', input.approvedByEmail],
        ['Approved on', input.approvedAt.toLocaleDateString('en-GB')],
        ['Pack generated', input.generatedAt.toLocaleString('en-GB')],
        [
          'Duplicate employee check',
          input.duplicateCheck.status === 'CLEAR'
            ? 'Clear — no existing employee matched'
            : `${input.duplicateCheck.status}: ${input.duplicateCheck.matches
                .map((match) => `${match.name} (${match.erpPersonnelNumber})`)
                .join(', ')}`,
        ],
      ],
    },
    {
      heading: 'Personal details',
      rows: [
        ['Full name', formatValue(dataset.personal.fullName)],
        ['Preferred name', formatValue(dataset.personal.preferredName)],
        ['Email', formatValue(dataset.personal.email)],
        ['Primary phone', formatValue(dataset.personal.primaryPhone)],
        ['Alternate phone', formatValue(dataset.personal.alternatePhone)],
        ['Address', formatValue(dataset.personal.address)],
        ['Nationality', formatValue(dataset.personal.nationality)],
      ],
    },
    {
      heading: 'Position and contract',
      rows: [
        ['Department', formatValue(dataset.position.department)],
        ['Position', formatValue(dataset.position.position)],
        ['Grade', formatValue(dataset.position.grade)],
        ['Step', formatValue(dataset.position.step)],
        ['Supervisor / reporting line', formatValue(dataset.position.supervisor)],
        ['Duty station', formatValue(dataset.position.dutyStation)],
        ['Contract type', formatValue(dataset.position.contractType)],
        ['Start date', formatValue(dataset.position.contractStart)],
        ['End date', formatValue(dataset.position.contractEnd)],
        ['Budget / project code', formatValue(dataset.position.projectCode)],
      ],
    },
    {
      heading: 'Remuneration',
      rows: [
        ['Salary', formatValue(dataset.remuneration.salary)],
        ['Period', formatValue(dataset.remuneration.period)],
        ['Budget line', formatValue(dataset.remuneration.budgetLine)],
        ['Funding source', formatValue(dataset.remuneration.fundingSource)],
      ],
    },
    {
      heading: 'Statutory and payroll details',
      rows: [
        ['Bank details', formatStatutory(dataset.statutory.bank)],
        ['Tax details', formatStatutory(dataset.statutory.tax)],
        ['Pension details', formatStatutory(dataset.statutory.pension)],
        ['Emergency contact', formatStatutory(dataset.statutory.emergencyContact)],
        ['Next of kin', formatStatutory(dataset.statutory.nextOfKin)],
      ],
    },
    {
      heading: 'Clearance evidence',
      rows: [
        ['Offer accepted', formatValue(dataset.clearance.offerAcceptedAt)],
        ['Acceptance signature', formatValue(dataset.clearance.acceptanceSignature)],
        ['Pre-employment clearance', formatValue(dataset.clearance.clearedAt)],
        ...dataset.clearance.checks.map(
          (check) => [check.type.replaceAll('_', ' '), `${check.status}${check.outcome ? ` (${check.outcome})` : ''}`] as [string, string]
        ),
      ],
    },
  ]

  return brandedPdf({
    title: 'ERP handover pack',
    subtitle: `${dataset.personal.fullName}  |  ${dataset.position.position}`,
    reference: input.erpPersonnelNumber,
    sections,
    footerNote: 'FRAD Foundation  |  Confidential — for ERP data entry only',
  })
}
