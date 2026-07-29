import { offerPdf } from './simple-pdf'

export const DEFAULT_OFFER_WORDING = `Dear {{candidate_name}},

We are pleased to offer you the position of {{position}} with FRAD Foundation, based at {{duty_station}}.

The principal terms of the offer are set out below. Please read the full letter carefully before recording your response.

If anything in this letter is unclear, contact the recruitment team before the response deadline.

Yours sincerely,
Human Resources
FRAD Foundation`

export interface OfferDocumentInput {
  id: string
  candidateName: string
  position: string
  dutyStation: string
  contractType: string
  contractDuration?: string | null
  salary: string
  startDate: Date
  endDate?: Date | null
  probationPeriod?: string | null
  reportingLine?: string | null
  conditions?: string | null
  acceptanceDeadline: Date
  templateBody?: string | null
}

export function buildOfferDocument(input: OfferDocumentInput, mode: 'PREVIEW' | 'ISSUED') {
  const variables: Record<string, string> = {
    candidate_name: input.candidateName,
    position: input.position,
    duty_station: input.dutyStation,
    contract_type: input.contractType,
    contract_duration: input.contractDuration || '',
    salary: input.salary,
    start_date: input.startDate.toLocaleDateString('en-GB'),
    end_date: input.endDate?.toLocaleDateString('en-GB') || '',
    probation_period: input.probationPeriod || '',
    reporting_line: input.reportingLine || '',
    conditions: input.conditions || '',
    acceptance_deadline: input.acceptanceDeadline.toLocaleDateString('en-GB'),
  }
  const rendered = (input.templateBody || DEFAULT_OFFER_WORDING).replace(
    /\{\{([a-z_]+)\}\}/gi,
    (token, key) => variables[key] ?? token
  )

  return offerPdf({
    reference: `FRAD-OFFER-${input.id.slice(0, 8).toUpperCase()}`,
    issuedAt: new Date(),
    documentStatus: mode,
    candidateName: input.candidateName,
    position: input.position,
    body: rendered,
    terms: [
      { label: 'Duty station', value: input.dutyStation },
      { label: 'Contract', value: [input.contractType, input.contractDuration].filter(Boolean).join(' / ') },
      { label: 'Compensation', value: input.salary },
      { label: 'Start date', value: input.startDate.toLocaleDateString('en-GB') },
      { label: 'End date', value: input.endDate?.toLocaleDateString('en-GB') || '' },
      { label: 'Probation', value: input.probationPeriod || '' },
      { label: 'Reports to', value: input.reportingLine || '' },
    ],
    conditions: input.conditions && !rendered.includes(input.conditions) ? input.conditions : null,
    responseDeadline: input.acceptanceDeadline,
  })
}
