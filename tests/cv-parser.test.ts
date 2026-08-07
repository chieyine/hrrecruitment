import { describe, expect, it } from 'vitest'
import { parseCvText, extractEmail, extractPhone, extractName } from '@/lib/cv-parser'

const SAMPLE_CV = `
Aminu Ibrahim Bello
12 Wuse 2, Abuja, Nigeria
aminu.bello@example.com  |  +234 803 555 1234

PROFILE
Public health professional with field experience in northern Nigeria.

WORK EXPERIENCE
Health Programme Officer at Oxfam Nigeria
Mar 2019 - Present
 - Led immunisation outreach across 14 LGAs
Monitoring Officer, Save the Children
Jan 2017 - Feb 2019
 - Managed routine data collection

EDUCATION
MSc Public Health, University of Ibadan, 2016
BSc Nursing, Ahmadu Bello University, 2012

SKILLS
Microsoft Excel; Power BI; ODK Collect, Data analysis

CERTIFICATIONS
Project Management Professional (PMP)
Nursing Council Licence

LANGUAGES
English, Hausa, Fulfulde

PROFESSIONAL MEMBERSHIPS
Nigeria Public Health Association
`

describe('field extraction', () => {
  it('finds an email address', () => {
    expect(extractEmail('Contact: Aminu.Bello@Example.COM here')).toBe('aminu.bello@example.com')
  })

  it('returns null when there is no email', () => {
    expect(extractEmail('no address here')).toBeNull()
  })

  it('finds a phone number with enough digits', () => {
    expect((extractPhone('Tel: +234 803 555 1234') || '').replace(/\D/g, '').length).toBeGreaterThanOrEqual(10)
  })

  it('ignores a short number that cannot be a phone number', () => {
    expect(extractPhone('Room 204')).toBeNull()
  })

  it('takes the name from the first plausible line', () => {
    expect(extractName(['Curriculum Vitae', 'Aminu Ibrahim Bello', 'aminu@example.com'])).toBe('Aminu Ibrahim Bello')
  })

  it('does not treat a contact line as a name', () => {
    expect(extractName(['aminu@example.com', '+234 803 555 1234'])).toBeNull()
  })
})

describe('parseCvText — §28.1 structured extraction', () => {
  const parsed = parseCvText(SAMPLE_CV)

  it('extracts the candidate name and contact details', () => {
    expect(parsed.fullName).toBe('Aminu Ibrahim Bello')
    expect(parsed.email).toBe('aminu.bello@example.com')
  })

  it('extracts education with qualification, institution and year', () => {
    expect(parsed.education.length).toBe(2)
    expect(parsed.education[0].qualification).toBe('MSc')
    expect(parsed.education[0].institution).toBe('University of Ibadan')
    expect(parsed.education[0].completionYear).toBe(2016)
  })

  it('extracts employment with dates and flags the current role', () => {
    expect(parsed.employment.length).toBe(2)
    expect(parsed.employment[0].isCurrent).toBe(true)
    expect(parsed.employment[1].startDate).toBe('2017-01')
    expect(parsed.employment[1].endDate).toBe('2019-02')
  })

  it('extracts skills, languages and memberships', () => {
    expect(parsed.skills.length).toBeGreaterThanOrEqual(4)
    expect(parsed.languages.length).toBe(3)
    expect(parsed.professionalMemberships.length).toBe(1)
  })

  it('estimates total experience without double-counting', () => {
    expect(parsed.totalExperienceYears).toBeGreaterThan(8)
  })

  it('reports high confidence when most fields were found', () => {
    expect(parsed.confidence).toBeGreaterThanOrEqual(0.8)
  })
})

describe('parseCvText — conservative behaviour', () => {
  it('invents nothing from an unstructured document', () => {
    const parsed = parseCvText('Hello there\nNothing useful here at all')
    expect(parsed.education.length).toBe(0)
    expect(parsed.employment.length).toBe(0)
    expect(parsed.totalExperienceYears).toBeNull()
  })

  it('reports low confidence when little was found', () => {
    expect(parseCvText('Hello there').confidence).toBeLessThanOrEqual(0.34)
  })

  it('handles a CV with no section headings at all', () => {
    const parsed = parseCvText('Jane Doe\nBSc Economics, University of Lagos, 2015\nAnalyst at ACME\nJan 2016 - Dec 2019')
    expect(parsed.education.length).toBe(1)
    expect(parsed.employment.length).toBe(1)
  })

  it('rejects an implausible completion year', () => {
    const parsed = parseCvText('EDUCATION\nBSc Something, Some University, 1832')
    expect(parsed.education[0]?.completionYear).toBeNull()
  })
})
