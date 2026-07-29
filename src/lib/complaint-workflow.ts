const TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ['TRIAGED'],
  TRIAGED: ['INVESTIGATING', 'AWAITING_INFORMATION'],
  INVESTIGATING: ['AWAITING_INFORMATION', 'RESOLVED'],
  AWAITING_INFORMATION: ['INVESTIGATING', 'RESOLVED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
}

export function allowedComplaintTransitions(status: string, canClose: boolean) {
  return (TRANSITIONS[status] || []).filter((next) => next !== 'CLOSED' || canClose)
}

export function canTransitionComplaint(from: string, to: string, canClose: boolean) {
  return allowedComplaintTransitions(from, canClose).includes(to)
}
