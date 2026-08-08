/* eslint-disable no-console -- seeding is a CLI script and reports progress on stdout */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The demo seed is disabled in production. Use the controlled bootstrap procedure instead.')
  }
  console.log('🌱 Starting database seed...')

  // 1. Roles
  const roles = [
    { name: 'PUBLIC', description: 'Public visitor' },
    { name: 'CANDIDATE', description: 'Job applicant and preboarding candidate' },
    { name: 'RECRUITMENT_OFFICER', description: 'HR recruitment officer managing vacancies & candidates' },
    { name: 'HR_MANAGER', description: 'HR Manager approving vacancies, offers & waivers' },
    { name: 'HIRING_MANAGER', description: 'Hiring manager reviewing assigned candidates & panels' },
    {
      name: 'BUDGET_HOLDER',
      description: 'Budget Holder confirming funding, ceilings and budget lines for staffing requests',
    },
    { name: 'PANEL_MEMBER', description: 'Interview panel scoring member' },
    { name: 'APPROVER', description: 'Executive approver' },
    { name: 'COURSE_ADMIN', description: 'Preboarding course administrator' },
    { name: 'SYSTEM_ADMIN', description: 'System administrator' },
    { name: 'AUDITOR', description: 'Read-only compliance auditor' },
  ]

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    })
  }
  console.log('✅ Roles created')

  // 2. Default System Admin & Users
  // Demo password comes from env so it can be rotated / not committed.
  const seedPassword = process.env.SEED_PASSWORD
  if (!seedPassword || seedPassword.length < 12 || !/[A-Za-z]/.test(seedPassword) || !/[0-9]/.test(seedPassword))
    throw new Error('SEED_PASSWORD must be explicitly set and contain at least 12 characters, a letter, and a number')
  const passwordHash = await bcrypt.hash(seedPassword, 12)

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@fradfoundation.org' },
    update: { passwordHash, sessionVersion: { increment: 1 } },
    create: {
      email: 'admin@fradfoundation.org',
      passwordHash,
      accountStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  })

  const adminRole = await prisma.role.findUnique({ where: { name: 'SYSTEM_ADMIN' } })
  if (adminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId_scopeType_scopeId: {
          userId: adminUser.id,
          roleId: adminRole.id,
          scopeType: 'GLOBAL',
          scopeId: 'GLOBAL',
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRole.id,
        scopeType: 'GLOBAL',
        scopeId: 'GLOBAL',
      },
    })
  }

  const hrManagerUser = await prisma.user.upsert({
    where: { email: 'hrmanager@fradfoundation.org' },
    update: { passwordHash, sessionVersion: { increment: 1 } },
    create: {
      email: 'hrmanager@fradfoundation.org',
      passwordHash,
      accountStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  })

  const hrRole = await prisma.role.findUnique({ where: { name: 'HR_MANAGER' } })
  if (hrRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId_scopeType_scopeId: {
          userId: hrManagerUser.id,
          roleId: hrRole.id,
          scopeType: 'GLOBAL',
          scopeId: 'GLOBAL',
        },
      },
      update: {},
      create: {
        userId: hrManagerUser.id,
        roleId: hrRole.id,
        scopeType: 'GLOBAL',
        scopeId: 'GLOBAL',
      },
    })
  }

  // Demo Candidate
  const candidateUser = await prisma.user.upsert({
    where: { email: 'candidate@example.com' },
    update: { passwordHash, sessionVersion: { increment: 1 } },
    create: {
      email: 'candidate@example.com',
      passwordHash,
      accountStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  })

  const candidateRole = await prisma.role.findUnique({ where: { name: 'CANDIDATE' } })
  if (candidateRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId_scopeType_scopeId: {
          userId: candidateUser.id,
          roleId: candidateRole.id,
          scopeType: 'GLOBAL',
          scopeId: 'GLOBAL',
        },
      },
      update: {},
      create: {
        userId: candidateUser.id,
        roleId: candidateRole.id,
        scopeType: 'GLOBAL',
        scopeId: 'GLOBAL',
      },
    })
  }

  // Dedicated demo identities make every documented persona testable without
  // sharing an account or combining incompatible duties.
  const personaUsers = [
    ['recruitment.officer@fradfoundation.org', 'RECRUITMENT_OFFICER'],
    ['hiring.manager@fradfoundation.org', 'HIRING_MANAGER'],
    ['budget.holder@fradfoundation.org', 'BUDGET_HOLDER'],
    ['panel.member@fradfoundation.org', 'PANEL_MEMBER'],
    ['approver@fradfoundation.org', 'APPROVER'],
    ['course.admin@fradfoundation.org', 'COURSE_ADMIN'],
    ['auditor@fradfoundation.org', 'AUDITOR'],
  ] as const
  for (const [email, roleName] of personaUsers) {
    const persona = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, accountStatus: 'ACTIVE', emailVerifiedAt: new Date(), sessionVersion: { increment: 1 } },
      create: { email, passwordHash, accountStatus: 'ACTIVE', emailVerifiedAt: new Date() },
    })
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } })
    await prisma.userRole.upsert({
      where: {
        userId_roleId_scopeType_scopeId: {
          userId: persona.id,
          roleId: role.id,
          scopeType: 'GLOBAL',
          scopeId: 'GLOBAL',
        },
      },
      update: {},
      create: { userId: persona.id, roleId: role.id, scopeType: 'GLOBAL', scopeId: 'GLOBAL' },
    })
  }

  await prisma.candidateProfile.upsert({
    where: { userId: candidateUser.id },
    update: {},
    create: {
      userId: candidateUser.id,
      legalFirstName: 'Aminu',
      middleName: 'Ibrahim',
      lastName: 'Bello',
      preferredName: 'Aminu',
      nationality: 'Nigerian',
      countryOfResidence: 'Nigeria',
      state: 'FCT - Abuja',
      lga: 'Abuja Municipal',
      city: 'Abuja',
      address: '15 Area 11, Garki, Abuja',
      primaryPhone: '+2348012345678',
      preferredContactMethod: 'EMAIL',
      willingnessToRelocate: true,
      profileCompletionPercentage: 85,
    },
  })
  console.log('✅ Default users & candidate profile created')

  // 3. Departments
  const departments = [
    { name: 'Programmes', code: 'PRG' },
    { name: 'Health', code: 'HLT' },
    { name: 'Nutrition', code: 'NUT' },
    { name: 'WASH', code: 'WSH' },
    { name: 'MEAL', code: 'MEL' },
    { name: 'Finance', code: 'FIN' },
    { name: 'Procurement', code: 'PRO' },
    { name: 'Human Resources', code: 'HR' },
    { name: 'Operations', code: 'OPS' },
    { name: 'Security', code: 'SEC' },
    { name: 'Communications', code: 'COM' },
    { name: 'Information Technology', code: 'IT' },
  ]

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name },
      create: dept,
    })
  }
  console.log('✅ Departments created')

  // 4. Projects
  const projects = [
    { name: 'Emergency Health Response', code: 'EHR-2026' },
    { name: 'Northeast Nutrition Initiative', code: 'NNI-2026' },
    { name: 'WASH Community Resilience', code: 'WCR-2026' },
  ]

  for (const proj of projects) {
    await prisma.project.upsert({
      where: { code: proj.code },
      update: { name: proj.name },
      create: proj,
    })
  }

  // 5. Duty Stations
  const dutyStations = [
    {
      name: 'Abuja HQ',
      state: 'FCT',
      lga: 'Abuja Municipal',
      address: 'Plot 402 Cadastral Zone, Central Business District',
    },
    { name: 'Maiduguri Field Office', state: 'Borno', lga: 'Maiduguri', address: '12 Damboa Road, Maiduguri' },
    { name: 'Damaturu Field Office', state: 'Yobe', lga: 'Damaturu', address: '5 Gujba Road, Damaturu' },
    { name: 'Yola Field Office', state: 'Adamawa', lga: 'Yola North', address: '18 Army Barracks Road, Yola' },
  ]

  for (const station of dutyStations) {
    const existing = await prisma.dutyStation.findFirst({ where: { name: station.name } })
    if (!existing) {
      await prisma.dutyStation.create({ data: station })
    }
  }
  console.log('✅ Duty Stations & Projects created')

  const contractTypes = [
    'Permanent',
    'Fixed term',
    'Temporary',
    'Consultant',
    'Intern',
    'Volunteer',
    'Casual worker',
    'Enumerator',
    'Community worker',
  ]
  for (const name of contractTypes) {
    const code = name.toUpperCase().replace(/\s+/g, '_')
    await prisma.contractType.upsert({ where: { code }, update: { name, active: true }, create: { code, name } })
  }
  const vacancyCategories = [
    'Programme',
    'Technical',
    'Operations',
    'Finance',
    'Human resources',
    'MEAL',
    'Security',
    'Communications',
    'Information technology',
    'Consultancy',
    'Internship',
    'Volunteer',
  ]
  for (const name of vacancyCategories) {
    const code = name.toUpperCase().replace(/\s+/g, '_')
    await prisma.vacancyCategory.upsert({ where: { code }, update: { name, active: true }, create: { code, name } })
  }
  const documentTypes = [
    ['CV', 'Curriculum Vitae'],
    ['COVER_LETTER', 'Cover Letter'],
    ['IDENTITY', 'Identity Document'],
    ['PASSPORT_PHOTO', 'Passport Photograph'],
    ['ACADEMIC_CERTIFICATE', 'Academic Certificate'],
    ['PROFESSIONAL_LICENCE', 'Professional Licence'],
    ['SIGNED_OFFER', 'Signed Offer'],
  ]
  for (const [code, name] of documentTypes)
    await prisma.documentType.upsert({ where: { code }, update: { name, active: true }, create: { code, name } })
  const settings = [
    { key: 'RETENTION_UNSUBMITTED_DRAFT_DAYS', valueJson: '90', description: 'Days to retain abandoned drafts' },
    { key: 'RETENTION_NOTIFICATION_DAYS', valueJson: '90', description: 'Days to retain read notifications' },
    {
      key: 'RETENTION_EXPIRED_REFERENCE_DAYS',
      valueJson: '365',
      description: 'Days to retain expired reference request tokens',
    },
  ]
  for (const setting of settings)
    await prisma.systemSetting.upsert({ where: { key: setting.key }, update: setting, create: setting })
  const notificationTemplates = [
    {
      code: 'APPLICATION_RECEIVED',
      subject: 'Application received',
      bodyTemplate: 'Dear {{candidate_name}}, your application for {{vacancy_title}} has been received.',
    },
    {
      code: 'ASSESSMENT_INVITATION',
      subject: 'Assessment for {{vacancy_title}}',
      bodyTemplate:
        'Dear {{candidate_first_name}}, an assessment is ready in your account for {{vacancy_title}}. Please review the instructions and deadline before you begin.',
    },
    {
      code: 'INTERVIEW_SCHEDULED',
      subject: 'Interview for {{vacancy_title}}',
      bodyTemplate:
        'Dear {{candidate_first_name}}, we would like to meet with you about {{vacancy_title}}. Your account contains the interview time, format and response options.',
    },
    {
      code: 'INTERVIEW_RESCHEDULED',
      subject: 'Updated interview arrangements',
      bodyTemplate:
        'Dear {{candidate_first_name}}, the interview arrangements for {{vacancy_title}} have changed. Please review and respond to the updated details in your account.',
    },
    {
      code: 'REFERENCE_UPDATE',
      subject: 'Reference check update',
      bodyTemplate:
        'Dear {{candidate_first_name}}, we are completing the reference stage for {{vacancy_title}}. We will contact you through your account if anything else is needed.',
    },
    {
      code: 'PROCESS_DELAY',
      subject: 'An update on {{vacancy_title}}',
      bodyTemplate:
        'Dear {{candidate_first_name}}, our review for {{vacancy_title}} is taking longer than planned. Your application remains active and we will contact you when there is a decision.',
    },
    {
      code: 'NOT_SELECTED',
      subject: 'Outcome of your application',
      bodyTemplate:
        'Dear {{candidate_first_name}}, thank you for your interest in {{vacancy_title}}. We will not be progressing your application further on this occasion.',
    },
    {
      code: 'OFFER_SENT',
      subject: 'Your FRAD offer is ready',
      bodyTemplate: 'Dear {{candidate_name}}, review your offer for {{vacancy_title}} before {{deadline}}.',
    },
    {
      code: 'OFFER_CLARIFICATION',
      subject: 'Your offer question',
      bodyTemplate:
        'Dear {{candidate_first_name}}, we have received your question about the offer for {{vacancy_title}}. A member of the recruitment team will respond through your account.',
    },
    {
      code: 'PREBOARDING_REMINDER',
      subject: 'Preboarding action required',
      bodyTemplate: 'Dear {{candidate_name}}, please complete {{item_title}} by {{due_date}}.',
    },
  ]
  for (const template of notificationTemplates)
    await prisma.notificationTemplate.upsert({ where: { code: template.code }, update: template, create: template })

  // 6. Default Screening Scorecard Template
  let defaultScorecard = await prisma.scorecardTemplate.findFirst({
    where: { name: 'Default FRAD Recruitment Scorecard', scorecardType: 'SCREENING' },
  })
  if (!defaultScorecard)
    defaultScorecard = await prisma.scorecardTemplate.create({
      data: {
        name: 'Default FRAD Recruitment Scorecard',
        scorecardType: 'SCREENING',
        description: 'Standard screening criteria for FRAD candidate evaluation',
        criteria: {
          create: [
            {
              name: 'Required Qualification',
              maximumScore: 10,
              weight: 1.0,
              required: true,
              guidance: 'Highest level of education relevant to the role',
            },
            {
              name: 'Relevant Work Experience',
              maximumScore: 25,
              weight: 1.0,
              required: true,
              guidance: 'Years and direct relevance of past experience',
            },
            {
              name: 'NGO / Humanitarian Experience',
              maximumScore: 15,
              weight: 1.0,
              required: false,
              guidance: 'Experience in emergency or development setting',
            },
            {
              name: 'Technical Competency & Skills',
              maximumScore: 20,
              weight: 1.0,
              required: true,
              guidance: 'Demonstrated domain technical knowledge',
            },
            {
              name: 'Duty-Location & Field Readiness',
              maximumScore: 10,
              weight: 1.0,
              required: false,
              guidance: 'Familiarity or readiness for duty station environment',
            },
            {
              name: 'Communication & Application Quality',
              maximumScore: 10,
              weight: 1.0,
              required: true,
              guidance: 'Clarity, grammar, completeness of application',
            },
            {
              name: 'Additional Relevant Certifications',
              maximumScore: 10,
              weight: 1.0,
              required: false,
              guidance: 'Professional licences, certifications, IT skills',
            },
          ],
        },
      },
    })
  console.log('✅ Default Scorecard Template created:', defaultScorecard.name)

  // 7. Policy Documents
  const policies = [
    {
      title: 'FRAD Code of Conduct',
      category: 'CODE_OF_CONDUCT',
      effectiveDate: new Date('2026-01-01'),
      summary: 'Standards of personal and professional conduct required of all FRAD personnel.',
    },
    {
      title: 'Safeguarding Policy',
      category: 'SAFEGUARDING',
      effectiveDate: new Date('2026-01-01'),
      summary: 'Framework for protecting vulnerable individuals from harm or abuse.',
    },
    {
      title: 'PSEA Policy (Prevention of Sexual Exploitation and Abuse)',
      category: 'PSEA',
      effectiveDate: new Date('2026-01-01'),
      summary: 'Zero-tolerance policy against sexual exploitation, abuse, and harassment.',
    },
    {
      title: 'Confidentiality & Non-Disclosure Agreement',
      category: 'CONFIDENTIALITY',
      effectiveDate: new Date('2026-01-01'),
      summary: 'Protection of sensitive organizational data, beneficiary records, and proprietary info.',
    },
  ]

  for (const pol of policies) {
    const existing = await prisma.policyDocument.findFirst({ where: { title: pol.title } })
    if (!existing) {
      await prisma.policyDocument.create({ data: pol })
    }
  }

  // 8. Courses
  const courses = [
    {
      title: 'Introduction to FRAD',
      category: 'CORE',
      estimatedDurationMinutes: 30,
      passMark: 80,
      learningObjectives: 'Overview of FRAD mandate, structure, values, and operating procedures.',
    },
    {
      title: 'Safeguarding & PSEA Awareness',
      category: 'CORE',
      estimatedDurationMinutes: 45,
      passMark: 85,
      learningObjectives: 'Understanding reporting obligations, boundary violations, and protection protocols.',
    },
    {
      title: 'Security Awareness & Field Protocols',
      category: 'CORE',
      estimatedDurationMinutes: 40,
      passMark: 80,
      learningObjectives: 'Basic security management, movement protocols, and emergency procedures.',
    },
  ]

  for (const c of courses) {
    const existing = await prisma.course.findFirst({ where: { title: c.title } })
    if (!existing) {
      const created = await prisma.course.create({ data: c })
      // Add sample quiz question
      await prisma.courseQuizQuestion.create({
        data: {
          courseId: created.id,
          questionType: 'MCQ',
          question: 'What is FRAD policy regarding recruitment fees?',
          optionsJson: JSON.stringify([
            'FRAD charges a nominal fee',
            'FRAD never charges any recruitment fee at any stage',
            'Fees depend on duty station',
          ]),
          correctAnswerJson: JSON.stringify(['FRAD never charges any recruitment fee at any stage']),
          score: 1.0,
          displayOrder: 1,
        },
      })
    }
  }

  // 9. Preboarding Form Templates
  // `handoverPurpose` is what the §19.2 ERP pack reads. It is set explicitly so
  // renaming a form can never silently drop payroll data out of the handover.
  const forms = [
    {
      title: 'Personal & Residential Details Form',
      description: 'Full legal names, nationality, residential address',
      handoverPurpose: 'NONE',
      schemaJson: JSON.stringify({ fields: [{ name: 'legalName', type: 'text', required: true }] }),
    },
    {
      title: 'Emergency Contact Form',
      description: 'Primary emergency contact',
      sensitivityClass: 'RESTRICTED',
      handoverPurpose: 'EMERGENCY_CONTACT',
      schemaJson: JSON.stringify({
        fields: [
          { name: 'contactName', type: 'text', required: true },
          { name: 'contactPhone', type: 'text', required: true },
          { name: 'relationship', type: 'text', required: true },
        ],
      }),
    },
    {
      title: 'Next-of-Kin Form',
      description: 'Next of kin record',
      sensitivityClass: 'RESTRICTED',
      handoverPurpose: 'NEXT_OF_KIN',
      schemaJson: JSON.stringify({
        fields: [
          { name: 'kinName', type: 'text', required: true },
          { name: 'kinPhone', type: 'text', required: true },
          { name: 'relationship', type: 'text', required: true },
        ],
      }),
    },
    {
      title: 'Bank Account Form',
      description: 'Payroll bank details (Restricted Access)',
      sensitivityClass: 'RESTRICTED',
      handoverPurpose: 'BANK_DETAILS',
      schemaJson: JSON.stringify({
        fields: [
          { name: 'bankName', type: 'text', required: true },
          { name: 'accountNumber', type: 'text', required: true },
          { name: 'accountName', type: 'text', required: true },
        ],
      }),
    },
    {
      title: 'Tax Information Form',
      description: 'Tax identification details (Restricted Access)',
      sensitivityClass: 'RESTRICTED',
      handoverPurpose: 'TAX_DETAILS',
      schemaJson: JSON.stringify({
        fields: [
          { name: 'taxIdentificationNumber', type: 'text', required: true },
          { name: 'taxState', type: 'text', required: true },
        ],
      }),
    },
    {
      title: 'Pension Details Form',
      description: 'Pension administrator and RSA number (Restricted Access)',
      sensitivityClass: 'RESTRICTED',
      handoverPurpose: 'PENSION_DETAILS',
      schemaJson: JSON.stringify({
        fields: [
          { name: 'pensionAdministrator', type: 'text', required: true },
          { name: 'rsaNumber', type: 'text', required: true },
        ],
      }),
    },
  ]

  for (const f of forms) {
    const existing = await prisma.preboardingFormTemplate.findFirst({ where: { title: f.title } })
    if (!existing) await prisma.preboardingFormTemplate.create({ data: f })
    else
      await prisma.preboardingFormTemplate.update({
        where: { id: existing.id },
        data: { sensitivityClass: f.sensitivityClass || 'STANDARD', handoverPurpose: f.handoverPurpose },
      })
  }

  // 10. Sample Published Vacancy
  const deptHR = await prisma.department.findUnique({ where: { code: 'HR' } })
  const stationHQ = await prisma.dutyStation.findFirst({ where: { name: 'Abuja HQ' } })
  const categoryHR = await prisma.vacancyCategory.findUnique({ where: { code: 'HUMAN_RESOURCES' } })

  if (deptHR && stationHQ) {
    const sampleVacancy = await prisma.vacancy.upsert({
      where: { referenceNumber: 'FRAD-HR-2026-001' },
      update: {},
      create: {
        referenceNumber: 'FRAD-HR-2026-001',
        title: 'Senior Human Resources Officer',
        departmentId: deptHR.id,
        categoryId: categoryHR?.id,
        dutyStationId: stationHQ.id,
        numberOfPositions: 2,
        contractType: 'FIXED_TERM',
        contractDuration: '12 Months (Renewable)',
        reportingLine: 'Human Resources Manager',
        summary:
          'We are looking for a qualified Senior HR Officer to oversee recruitment, onboarding, and employee relations at FRAD HQ.',
        responsibilities:
          '- Coordinate end-to-end recruitment process\n- Supervise preboarding & candidate readiness checks\n- Ensure compliance with labor laws and organizational policies',
        essentialQualifications:
          'Bachelor Degree in Human Resource Management, Business Administration, or related social sciences.',
        desirableQualifications: 'CIPM or SHRM certification is an added advantage.',
        minimumExperienceYears: 5,
        desiredExperience: 'At least 5 years experience in NGO or humanitarian sector HR management.',
        openingAt: new Date('2026-07-01'),
        closingAt: new Date('2026-08-31'),
        status: 'OPEN',
        ownerUserId: hrManagerUser.id,
        screeningScorecardTemplateId: defaultScorecard.id,
      },
    })
    console.log('✅ Sample Published Vacancy created:', sampleVacancy.title)
  }

  // 11. Permissions & role-permission grants (§8)
  const permissions = [
    { code: '*', description: 'Legacy wildcard; not assigned to built-in roles' },
    { code: 'vacancy.create.all', description: 'Create vacancies' },
    { code: 'vacancy.read.all', description: 'Read all vacancies' },
    { code: 'vacancy.read.assigned', description: 'Read vacancies owned by or assigned to the user' },
    { code: 'vacancy.update.all', description: 'Update vacancies' },
    { code: 'application.read.assigned', description: 'Read assigned applications' },
    { code: 'application.read.all', description: 'Read all applications' },
    { code: 'application.stage.change', description: 'Change application stage' },
    { code: 'scorecard.submit', description: 'Submit scorecards' },
    { code: 'scorecard.reopen', description: 'Reopen submitted scorecards with a reason' },
    { code: 'assessment.manage', description: 'Manage assessments' },
    { code: 'interview.manage', description: 'Manage interviews' },
    { code: 'interview.score.assigned', description: 'Score interviews assigned to the user' },
    { code: 'reference.manage', description: 'Manage reference checks' },
    { code: 'offer.manage', description: 'Manage offers' },
    { code: 'preboarding.manage', description: 'Manage preboarding' },
    { code: 'preboarding.clearance', description: 'Issue final preboarding clearance' },
    { code: 'resumption.confirm', description: 'Confirm actual resumption' },
    { code: 'course.manage', description: 'Manage course content and enrolment' },
    {
      code: 'preboarding.restricted.read',
      description: 'Read restricted bank, pension, medical, accessibility and next-of-kin forms',
    },
    { code: 'erp.transfer', description: 'Record ERP transfer' },
    { code: 'admin.manage', description: 'Administer configuration' },
    { code: 'audit.read', description: 'Read audit logs' },
    { code: 'report.export', description: 'Export recruitment and preboarding reports' },
    { code: 'complaint.manage', description: 'Manage restricted complaints and case records' },
    { code: 'governance.manage', description: 'Manage legal holds, retention and access reviews' },

    // §5 Staffing requests
    { code: 'staffing.request.create', description: 'Raise and edit own staffing requests' },
    { code: 'staffing.request.read.assigned', description: 'Read own or departmental staffing requests' },
    { code: 'staffing.request.read.all', description: 'Read all staffing requests' },
    { code: 'staffing.request.review', description: 'Review and return staffing requests as HR' },
    { code: 'staffing.request.approve', description: 'Approve a staffing request for vacancy preparation' },

    // §3.7, §17 Budget Holder funding authority
    { code: 'funding.confirm', description: 'Confirm or reject funding, ceilings and budget lines' },
    { code: 'funding.read', description: 'Read funding confirmations and financial envelopes' },
    { code: 'offer.financial.confirm', description: 'Confirm offer terms above the approved ceiling' },

    // §11 Longlisting
    { code: 'longlist.rule.manage', description: 'Define and amend vacancy longlisting rules' },
    { code: 'longlist.run', description: 'Run automatic longlisting over a vacancy' },
    { code: 'longlist.review', description: 'Work the longlisting exception-review queue' },
    { code: 'longlist.override', description: 'Override an automated longlisting outcome with a reason' },
    { code: 'longlist.confirm', description: 'Confirm the final longlist for a vacancy' },

    // §16, §28.11 Due diligence
    { code: 'backgroundcheck.manage', description: 'Request and record background and due-diligence checks' },
    { code: 'backgroundcheck.read.restricted', description: 'Read restricted background-check findings' },

    // §28.10 Electronic signatures
    { code: 'signature.sign', description: 'Apply an electronic signature or approval' },
    { code: 'signature.read', description: 'Read the electronic signature register' },
  ]
  for (const p of permissions) {
    await prisma.permission.upsert({ where: { code: p.code }, update: { description: p.description }, create: p })
  }

  const grants: Record<string, string[]> = {
    SYSTEM_ADMIN: ['admin.manage', 'audit.read', 'governance.manage'],
    HR_MANAGER: [
      'vacancy.create.all',
      'vacancy.read.all',
      'vacancy.update.all',
      'application.read.all',
      'application.stage.change',
      'scorecard.submit',
      'scorecard.reopen',
      'assessment.manage',
      'interview.manage',
      'reference.manage',
      'offer.manage',
      'preboarding.manage',
      'preboarding.clearance',
      'resumption.confirm',
      'preboarding.restricted.read',
      'erp.transfer',
      'audit.read',
      'report.export',
      'complaint.manage',
      'governance.manage',
      'staffing.request.create',
      'staffing.request.read.all',
      'staffing.request.review',
      'staffing.request.approve',
      'funding.read',
      'longlist.rule.manage',
      'longlist.run',
      'longlist.review',
      'longlist.override',
      'longlist.confirm',
      'backgroundcheck.manage',
      'backgroundcheck.read.restricted',
      'signature.sign',
      'signature.read',
    ],
    RECRUITMENT_OFFICER: [
      'vacancy.create.all',
      'vacancy.read.all',
      'vacancy.update.all',
      'application.read.all',
      'application.stage.change',
      'scorecard.submit',
      'assessment.manage',
      'interview.manage',
      'interview.score.assigned',
      'reference.manage',
      'offer.manage',
      'preboarding.manage',
      'resumption.confirm',
      'erp.transfer',
      'complaint.manage',
      // §11 The recruitment officer prepares rules and works the exception
      // queue, but confirming the longlist and overriding an automated outcome
      // stay with the HR Manager.
      'staffing.request.create',
      'staffing.request.read.all',
      'staffing.request.review',
      'funding.read',
      'longlist.rule.manage',
      'longlist.run',
      'longlist.review',
      'backgroundcheck.manage',
      'backgroundcheck.read.restricted',
      'signature.sign',
      'signature.read',
    ],
    HIRING_MANAGER: [
      'vacancy.read.assigned',
      'application.read.assigned',
      'scorecard.submit',
      'interview.manage',
      'interview.score.assigned',
      // §3.6 raises staffing requests and sees its own, but approves nothing.
      'staffing.request.create',
      'staffing.request.read.assigned',
      'signature.sign',
    ],
    // §3.7 Money only. No candidate records, no scores, no offers.
    BUDGET_HOLDER: [
      'staffing.request.read.assigned',
      'funding.confirm',
      'funding.read',
      'offer.financial.confirm',
      'signature.sign',
    ],
    PANEL_MEMBER: ['application.read.assigned', 'interview.score.assigned', 'signature.sign'],
    COURSE_ADMIN: ['course.manage'],
    APPROVER: ['staffing.request.read.all', 'signature.sign'],
    AUDITOR: [
      'vacancy.read.all',
      'application.read.all',
      'audit.read',
      'report.export',
      'staffing.request.read.all',
      'funding.read',
      'signature.read',
    ],
  }
  for (const [roleName, codes] of Object.entries(grants)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } })
    if (!role) continue
    const managedPermissions = await prisma.permission.findMany({
      where: { code: { in: permissions.map((item) => item.code) } },
      select: { id: true, code: true },
    })
    const allowedIds = managedPermissions
      .filter((permission) => codes.includes(permission.code))
      .map((permission) => permission.id)
    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
        permissionId: {
          in: managedPermissions
            .filter((permission) => !allowedIds.includes(permission.id))
            .map((permission) => permission.id),
        },
      },
    })
    for (const code of codes) {
      const perm = await prisma.permission.findUnique({ where: { code } })
      if (!perm) continue
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      })
    }
  }
  console.log('✅ Permissions & role grants created')

  // 12. Governed workflow and service-level defaults
  const slaPolicies = [
    {
      code: 'APPLICATION_REVIEW_NORMAL',
      name: 'Application review',
      workType: 'APPLICATION_REVIEW',
      targetMinutes: 1440,
      warningMinutes: 1080,
      escalationRole: 'HR_MANAGER',
      escalationAfterMinutes: 1440,
    },
    {
      code: 'APPROVAL_DECISION_NORMAL',
      name: 'Approval decision',
      workType: 'APPROVAL_DECISION',
      targetMinutes: 480,
      warningMinutes: 360,
      escalationRole: 'HR_MANAGER',
      escalationAfterMinutes: 480,
    },
    {
      code: 'PREBOARDING_REVIEW_NORMAL',
      name: 'Preboarding review',
      workType: 'PREBOARDING_REVIEW',
      targetMinutes: 1440,
      warningMinutes: 1080,
      escalationRole: 'HR_MANAGER',
      escalationAfterMinutes: 1440,
    },
    {
      code: 'OFFER_APPROVAL_NORMAL',
      name: 'Offer approval',
      workType: 'OFFER_APPROVAL',
      targetMinutes: 480,
      warningMinutes: 360,
      escalationRole: 'HR_MANAGER',
      escalationAfterMinutes: 480,
    },
    {
      code: 'REFERENCE_REVIEW_NORMAL',
      name: 'Reference concern review',
      workType: 'REFERENCE_REVIEW',
      priority: 'HIGH',
      targetMinutes: 480,
      warningMinutes: 240,
      escalationRole: 'HR_MANAGER',
      escalationAfterMinutes: 480,
    },
  ]
  for (const policy of slaPolicies) {
    await prisma.slaPolicy.upsert({ where: { code: policy.code }, update: policy, create: policy })
  }

  const applicationWorkflow = await prisma.workflowDefinition.upsert({
    where: { code: 'APPLICATION_LIFECYCLE' },
    update: { name: 'Application lifecycle', resourceType: 'APPLICATION', active: true },
    create: {
      code: 'APPLICATION_LIFECYCLE',
      name: 'Application lifecycle',
      resourceType: 'APPLICATION',
      description: 'Governed candidate journey from submission through ERP handover.',
    },
  })
  const activeWorkflow = await prisma.workflowVersion.upsert({
    where: { workflowDefinitionId_version: { workflowDefinitionId: applicationWorkflow.id, version: 1 } },
    update: { status: 'ACTIVE' },
    create: {
      workflowDefinitionId: applicationWorkflow.id,
      version: 1,
      status: 'ACTIVE',
      publishedBy: adminUser.id,
      publishedAt: new Date(),
    },
  })
  const transitions = [
    ['SUBMITTED', 'UNDER_REVIEW', 'application.stage.change', false],
    ['UNDER_REVIEW', 'LONGLISTED', 'application.stage.change', false],
    ['LONGLISTED', 'SHORTLISTED', 'application.stage.change', false],
    ['SHORTLISTED', 'ASSESSMENT_INVITED', 'assessment.manage', false],
    ['ASSESSMENT_COMPLETED', 'INTERVIEW_INVITED', 'interview.manage', false],
    ['INTERVIEW_COMPLETED', 'REFERENCE_CHECK', 'reference.manage', false],
    ['REFERENCE_CHECK', 'RECOMMENDED', 'application.stage.change', true],
    ['RECOMMENDED', 'OFFER_DRAFT', 'offer.manage', true],
    ['OFFER_ACCEPTED', 'PREBOARDING', 'preboarding.manage', false],
    ['PREBOARDING', 'READY_TO_RESUME', 'preboarding.clearance', true],
    ['READY_TO_RESUME', 'RESUMED', 'resumption.confirm', true],
    ['RESUMED', 'TRANSFERRED_TO_ERP', 'erp.transfer', true],
  ] as const
  for (const [fromStatus, toStatus, requiredPermission, makerChecker] of transitions) {
    await prisma.workflowTransitionRule.upsert({
      where: { workflowVersionId_fromStatus_toStatus: { workflowVersionId: activeWorkflow.id, fromStatus, toStatus } },
      update: { requiredPermission, makerChecker },
      create: { workflowVersionId: activeWorkflow.id, fromStatus, toStatus, requiredPermission, makerChecker },
    })
  }
  const integrations = [
    {
      provider: 'FRAD_NATIVE_ICS',
      connectionType: 'CALENDAR',
      displayName: 'Interview calendar files',
      status: 'ACTIVE',
      lastHealthStatus: 'HEALTHY',
    },
    {
      provider: 'FRAD_TYPED_SIGNATURE',
      connectionType: 'ESIGNATURE',
      displayName: 'Typed-name electronic signatures',
      status: 'ACTIVE',
      lastHealthStatus: 'HEALTHY',
    },
    {
      provider: 'FRAD_REFERENCE_PORTAL',
      connectionType: 'REFERENCE',
      displayName: 'Secure reference request portal',
      status: 'ACTIVE',
      lastHealthStatus: 'HEALTHY',
    },
    {
      provider: 'EXTERNAL_JOB_BOARD',
      connectionType: 'JOB_BOARD',
      displayName: 'External job-board adapter',
      status: 'DISCONNECTED',
      lastHealthStatus: null,
    },
    {
      provider: 'EXTERNAL_SMS',
      connectionType: 'SMS',
      displayName: 'SMS delivery adapter',
      status: 'DISCONNECTED',
      lastHealthStatus: null,
    },
  ]
  for (const integration of integrations) {
    await prisma.integrationConnection.upsert({
      where: {
        provider_connectionType: { provider: integration.provider, connectionType: integration.connectionType },
      },
      update: {
        displayName: integration.displayName,
        status: integration.status,
        lastHealthStatus: integration.lastHealthStatus,
      },
      create: integration,
    })
  }
  console.log('✅ Workflow and SLA defaults created')

  // 13. Default preboarding package (§57.4)
  let existingPkg = await prisma.preboardingPackage.findFirst({
    where: { name: 'Default General Preboarding Package' },
  })
  if (!existingPkg) {
    existingPkg = await prisma.preboardingPackage.create({
      data: {
        name: 'Default General Preboarding Package',
        description: 'Standard forms, policies, courses and tasks assigned to general new hires.',
        candidateType: 'GENERAL',
        roleCategory: 'GENERAL',
      },
    })
    console.log('✅ Default preboarding package created')
  }

  const documentDefinitions = [
    { name: 'Identity document', documentType: 'IDENTITY', sensitivityClass: 'RESTRICTED' },
    { name: 'Passport photograph', documentType: 'PASSPORT_PHOTO', sensitivityClass: 'STANDARD' },
    { name: 'Academic certificates', documentType: 'ACADEMIC_CERTIFICATE', sensitivityClass: 'CONFIDENTIAL' },
    { name: 'Signed offer', documentType: 'SIGNED_OFFER', sensitivityClass: 'CONFIDENTIAL' },
  ]
  for (const definition of documentDefinitions) {
    let requirement = await prisma.documentRequirement.findFirst({ where: { name: definition.name } })
    if (!requirement) requirement = await prisma.documentRequirement.create({ data: definition })
    const linked = await prisma.packageDocumentRequirement.findFirst({
      where: { preboardingPackageId: existingPkg.id, documentRequirementId: requirement.id },
    })
    if (!linked)
      await prisma.packageDocumentRequirement.create({
        data: { preboardingPackageId: existingPkg.id, documentRequirementId: requirement.id },
      })
  }

  const taskDefinitions = [
    { title: 'Confirm start date', description: 'Confirm the agreed start date with HR.' },
    {
      title: 'Confirm reporting instructions',
      description: 'Acknowledge the reporting location and first-day instructions.',
    },
  ]
  for (const definition of taskDefinitions) {
    let task = await prisma.preboardingTaskTemplate.findFirst({ where: { title: definition.title } })
    if (!task) task = await prisma.preboardingTaskTemplate.create({ data: definition })
    const linked = await prisma.packageTask.findFirst({
      where: { preboardingPackageId: existingPkg.id, taskTemplateId: task.id },
    })
    if (!linked)
      await prisma.packageTask.create({ data: { preboardingPackageId: existingPkg.id, taskTemplateId: task.id } })
  }

  const packageForms = await prisma.preboardingFormTemplate.findMany({ where: { active: true } })
  for (const form of packageForms) {
    const linked = await prisma.packageForm.findFirst({
      where: { preboardingPackageId: existingPkg.id, formTemplateId: form.id },
    })
    if (!linked)
      await prisma.packageForm.create({ data: { preboardingPackageId: existingPkg.id, formTemplateId: form.id } })
  }
  const packagePolicies = await prisma.policyDocument.findMany({ where: { active: true } })
  for (const policy of packagePolicies) {
    const linked = await prisma.packagePolicy.findFirst({
      where: { preboardingPackageId: existingPkg.id, policyDocumentId: policy.id },
    })
    if (!linked)
      await prisma.packagePolicy.create({ data: { preboardingPackageId: existingPkg.id, policyDocumentId: policy.id } })
  }
  const packageCourses = await prisma.course.findMany({ where: { active: true, category: 'CORE' } })
  for (const course of packageCourses) {
    const linked = await prisma.packageCourse.findFirst({
      where: { preboardingPackageId: existingPkg.id, courseId: course.id },
    })
    if (!linked)
      await prisma.packageCourse.create({ data: { preboardingPackageId: existingPkg.id, courseId: course.id } })
  }
  await prisma.vacancy.updateMany({
    where: { preboardingPackageId: null },
    data: { preboardingPackageId: existingPkg.id },
  })

  console.log('🎉 Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
