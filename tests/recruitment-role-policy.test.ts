import { describe, expect, it } from 'vitest'
import {
  canApproveRecruitmentResource,
  canMakeHrManagerDecision,
  canRunRecruitmentOperations,
} from '@/lib/recruitment-role-policy'

describe('recruitment role policy', () => {
  it('gives recruitment officers operational work without manager decisions', () => {
    expect(canRunRecruitmentOperations(['RECRUITMENT_OFFICER'])).toBe(true)
    expect(canMakeHrManagerDecision(['RECRUITMENT_OFFICER'])).toBe(false)
  })

  it('lets HR managers operate and make accountable decisions', () => {
    expect(canRunRecruitmentOperations(['HR_MANAGER'])).toBe(true)
    expect(canMakeHrManagerDecision(['HR_MANAGER'])).toBe(true)
  })

  it('keeps system-administrator accounts out even when they also carry an HR role', () => {
    const mixed = ['SYSTEM_ADMIN', 'HR_MANAGER']
    expect(canRunRecruitmentOperations(mixed)).toBe(false)
    expect(canMakeHrManagerDecision(mixed)).toBe(false)
    expect(canApproveRecruitmentResource(mixed, 'VACANCY')).toBe(false)
  })

  it('uses a resource-specific approval matrix', () => {
    expect(canApproveRecruitmentResource(['HR_MANAGER'], 'VACANCY')).toBe(true)
    expect(canApproveRecruitmentResource(['APPROVER'], 'VACANCY')).toBe(false)
    expect(canApproveRecruitmentResource(['HIRING_MANAGER'], 'SELECTION')).toBe(true)
    expect(canApproveRecruitmentResource(['APPROVER'], 'SELECTION')).toBe(true)
    expect(canApproveRecruitmentResource(['APPROVER'], 'OFFER')).toBe(true)
    expect(canApproveRecruitmentResource(['RECRUITMENT_OFFICER'], 'OFFER')).toBe(false)
  })
})
