import { candidateVisibleStatusForInternal } from './state-machine'

export const CANDIDATE_STATUS_GUIDANCE: Record<string, { meaning: string; action: string; next: string }> = {
  DRAFT: {
    meaning: 'Your application has not been submitted.',
    action: 'Complete all required questions and documents, then submit before the vacancy closes.',
    next: 'FRAD will confirm receipt after submission.',
  },
  APPLICATION_DRAFT: {
    meaning: 'Your application has not been submitted.',
    action: 'Complete all required questions and documents, then submit before the vacancy closes.',
    next: 'FRAD will confirm receipt after submission.',
  },
  SUBMITTED: {
    meaning: 'FRAD received your application.',
    action: 'No action is required unless FRAD contacts you.',
    next: 'The recruitment team will complete eligibility and screening review.',
  },
  APPLICATION_RECEIVED: {
    meaning: 'FRAD received your application.',
    action: 'No action is required unless FRAD contacts you.',
    next: 'The recruitment team will complete eligibility and screening review.',
  },
  UNSUCCESSFUL: {
    meaning: 'This application will not progress further.',
    action: 'Review any message from FRAD. You may contact HR if you need clarification.',
    next: 'You can continue to view other open vacancies.',
  },
  UNDER_REVIEW: {
    meaning: 'Your application is being reviewed.',
    action: 'Monitor messages and keep your contact details current.',
    next: 'FRAD may shortlist you or close the application after review.',
  },
  LONGLISTED: {
    meaning: 'Your application passed the initial review.',
    action: 'Continue monitoring your messages and dashboard.',
    next: 'FRAD will complete detailed shortlisting.',
  },
  SHORTLISTED: {
    meaning: 'You have progressed beyond initial screening.',
    action: 'Watch for an assessment or interview invitation.',
    next: 'The next evaluation activity will appear in your dashboard.',
  },
  ASSESSMENT_INVITED: {
    meaning: 'An assessment is ready or scheduled.',
    action: 'Review the deadline and complete it from the Assessments page.',
    next: 'The result may require automated or human marking.',
  },
  ASSESSMENT_COMPLETED: {
    meaning: 'Your assessment was received.',
    action: 'No action is required unless HR requests clarification.',
    next: 'FRAD will review the result and determine the next stage.',
  },
  ASSESSMENT_STAGE: {
    meaning: 'Your application is at the assessment stage.',
    action: 'Review any active assessment invitation; otherwise no action is required.',
    next: 'FRAD will review the assessment outcome and advise you of the next step.',
  },
  INTERVIEW_INVITED: {
    meaning: 'FRAD invited you to an interview.',
    action: 'Confirm attendance, request rescheduling, or request accommodation.',
    next: 'Interview details and updates appear in the Interviews page.',
  },
  INTERVIEW_COMPLETED: {
    meaning: 'Your interview stage is complete.',
    action: 'No action is required unless contacted.',
    next: 'FRAD will complete panel and selection review.',
  },
  INTERVIEW_STAGE: {
    meaning: 'Your application is at the interview stage.',
    action: 'Review and respond to any interview invitation in your dashboard.',
    next: 'FRAD will complete the panel review after the interview.',
  },
  REFERENCE_CHECK: {
    meaning: 'FRAD is completing reference checks.',
    action: 'Ensure your referees expect the secure request.',
    next: 'HR will verify received references before selection.',
  },
  RECOMMENDED: {
    meaning: 'You have been recommended following evaluation.',
    action: 'No action is required unless FRAD requests more information.',
    next: 'The recommendation still requires the applicable approval and offer process.',
  },
  OFFER_SENT: {
    meaning: 'A formal offer is available.',
    action: 'Review it and accept, decline, or request clarification before the deadline.',
    next: 'Accepted offers move to preboarding.',
  },
  OFFER_DRAFT: {
    meaning: 'FRAD is preparing an offer decision.',
    action: 'No action is required until a formal offer is sent.',
    next: 'You will be notified if an approved offer becomes available.',
  },
  OFFER_ACCEPTED: {
    meaning: 'Your offer has been accepted.',
    action: 'Open preboarding and review what you need to complete.',
    next: 'Your preboarding tasks will appear there.',
  },
  PREBOARDING_IN_PROGRESS: {
    meaning: 'Your offer was accepted and preboarding has started.',
    action: 'Complete assigned forms, documents, policies, courses, tasks and meetings.',
    next: 'HR reviews mandatory requirements before clearance.',
  },
  PREBOARDING: {
    meaning: 'Your offer was accepted and preboarding has started.',
    action: 'Complete assigned forms, documents, policies, courses, tasks and meetings.',
    next: 'HR reviews mandatory requirements before clearance.',
  },
  READY_TO_RESUME: {
    meaning: 'HR has confirmed readiness to resume.',
    action: 'Follow the reporting instructions and confirmed start date.',
    next: 'HR records actual resumption before ERP handover.',
  },
  RECRUITMENT_COMPLETED: {
    meaning: 'This recruitment process is complete.',
    action: 'Review any final message from FRAD.',
    next: 'You may retain your account for future vacancies.',
  },
  RESUMED: {
    meaning: 'FRAD recorded that you resumed duty.',
    action: 'Follow any final HR handover instructions.',
    next: 'HR will complete the manual ERP handover.',
  },
  TRANSFERRED_TO_ERP: {
    meaning: 'Your recruitment record has been handed over to the FRAD ERP process.',
    action: 'Use the HR channels provided to you for employee matters.',
    next: 'Ongoing employee administration takes place outside this platform.',
  },
  NOT_SELECTED: {
    meaning: 'Your application will not progress further for this vacancy.',
    action: 'Review any message from FRAD and consider future vacancies.',
    next: 'This application is closed unless FRAD contacts you about a review.',
  },
  INELIGIBLE: {
    meaning: 'FRAD determined that a mandatory vacancy requirement was not met.',
    action: 'Review the decision message. You may ask HR for clarification or submit an appeal.',
    next: 'FRAD will respond through the case or messaging channel.',
  },
  RESERVE: {
    meaning: 'You are on the reserve list for this vacancy.',
    action: 'Keep your contact details current and monitor messages.',
    next: 'FRAD may contact you if a suitable position becomes available.',
  },
  INCOMPLETE: {
    meaning: 'Your application is missing something it needs.',
    action: 'Open the application and supply the outstanding answers or documents before the vacancy closes.',
    next: 'FRAD can only assess a complete application.',
  },
  CONDITIONAL_OFFER: {
    meaning: 'FRAD has made you a conditional offer.',
    action: 'Review the conditions and complete anything they ask for.',
    next: 'A formal offer follows once the conditions are met.',
  },
  OFFER_DECLINED: {
    meaning: 'Your offer was recorded as declined.',
    action: 'No further action is required unless this is incorrect.',
    next: 'FRAD will close this application.',
  },
  OFFER_EXPIRED: {
    meaning: 'The offer response deadline passed without acceptance.',
    action: 'Contact HR promptly if you believe this is incorrect.',
    next: 'FRAD will close the offer or advise whether another action is possible.',
  },
  CANCELLED: {
    meaning: 'Recruitment for this application has been cancelled.',
    action: 'Review the notice from FRAD or contact HR for clarification.',
    next: 'FRAD will advise if the vacancy is reopened or replaced.',
  },
  WITHDRAWN: {
    meaning: 'You withdrew this application.',
    action: 'No further action is required.',
    next: 'The application will not continue.',
  },
}

const CANDIDATE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  APPLICATION_DRAFT: 'Draft',
  INCOMPLETE: 'Incomplete',
  SUBMITTED: 'Received',
  APPLICATION_RECEIVED: 'Received',
  UNDER_REVIEW: 'Under review',
  CONDITIONAL_OFFER: 'Conditional offer',
  LONGLISTED: 'Longlisted',
  SHORTLISTED: 'Shortlisted',
  ASSESSMENT_INVITED: 'Assessment invited',
  ASSESSMENT_COMPLETED: 'Assessment completed',
  ASSESSMENT_STAGE: 'Assessment stage',
  INTERVIEW_INVITED: 'Interview invited',
  INTERVIEW_COMPLETED: 'Interview completed',
  INTERVIEW_STAGE: 'Interview stage',
  REFERENCE_CHECK: 'Reference checks',
  RECOMMENDED: 'Recommended',
  OFFER_DRAFT: 'Offer in preparation',
  OFFER_SENT: 'Offer available',
  OFFER_ACCEPTED: 'Offer accepted',
  PREBOARDING: 'Preboarding',
  PREBOARDING_IN_PROGRESS: 'Preboarding',
  READY_TO_RESUME: 'Ready to start',
  RECRUITMENT_COMPLETED: 'Closed',
  RESUMED: 'Started',
  TRANSFERRED_TO_ERP: 'Handover completed',
  NOT_SELECTED: 'Not selected',
  INELIGIBLE: 'Not eligible',
  RESERVE: 'Reserve list',
  OFFER_DECLINED: 'Offer declined',
  OFFER_EXPIRED: 'Offer expired',
  CANCELLED: 'Cancelled',
  WITHDRAWN: 'Withdrawn',
}

export function candidateFacingStatus(
  internalStatus: string | null | undefined,
  candidateVisibleStatus: string | null | undefined
) {
  if (internalStatus === 'DRAFT') return 'APPLICATION_DRAFT'
  // Re-derive the disclosure-safe vocabulary on every read. Legacy records
  // may persist internal stages such as REFERENCE_CHECK or RECOMMENDED in the
  // display column, and candidate-facing code must never trust those values.
  if (internalStatus) return candidateVisibleStatusForInternal(internalStatus)
  return candidateVisibleStatus || 'APPLICATION_DRAFT'
}

export function candidateStatusLabel(status: string | null | undefined) {
  const value = status || 'APPLICATION_DRAFT'
  return (
    CANDIDATE_STATUS_LABELS[value] ||
    value
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/^./, (letter) => letter.toUpperCase())
  )
}

export function candidateStatusGuidance(status: string) {
  return (
    CANDIDATE_STATUS_GUIDANCE[status] || {
      meaning: 'Your application is progressing through FRAD recruitment.',
      action: 'Monitor your dashboard and messages.',
      next: 'FRAD will notify you when action is required.',
    }
  )
}
