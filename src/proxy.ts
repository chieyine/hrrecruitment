import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { hasStaffRole } from '@/lib/roles'

const secretRaw = process.env.JWT_SECRET
const secret = secretRaw && secretRaw.length >= 32 ? new TextEncoder().encode(secretRaw) : null

interface TokenPayload {
  userId?: string
  email?: string
  roles?: string[]
  purpose?: string
  sessionVersion?: number
}

async function readSession(req: NextRequest): Promise<TokenPayload | null> {
  const token = req.cookies.get('session_token')?.value
  if (!token || !secret) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    const session = payload as TokenPayload
    if (
      session.purpose !== 'session' ||
      !session.userId ||
      !Array.isArray(session.roles) ||
      !Number.isInteger(session.sessionVersion)
    )
      return null
    return session
  } catch {
    return null
  }
}

// Route area → allowed condition
function isCandidateArea(path: string) {
  return path.startsWith('/candidate') || path.startsWith('/api/candidate')
}
function isStaffArea(path: string) {
  return (
    path.startsWith('/recruitment') ||
    path.startsWith('/api/recruitment') ||
    path.startsWith('/admin') ||
    path.startsWith('/api/admin')
  )
}
function isAdminArea(path: string) {
  return path.startsWith('/admin') || path.startsWith('/api/admin')
}

function matchesRoute(path: string, routes: string[]) {
  return routes.some((route) => path === route || path.startsWith(`${route}/`))
}

const SYSTEM_ADMIN_ROUTES = [
  '/admin/users',
  '/admin/roles',
  '/admin/permissions',
  '/admin/system-settings',
  '/admin/deletion-requests',
  '/admin/governance',
  '/admin/operating-model',
  '/api/admin/users',
  '/api/admin/generic',
  '/api/admin/deletion-requests',
  '/api/admin/governance',
  '/api/admin/operating-model',
]

const RECRUITMENT_SETUP_ROUTES = [
  '/admin/departments',
  '/admin/projects',
  '/admin/duty-stations',
  '/admin/contract-types',
  '/admin/vacancy-categories',
  '/admin/document-types',
  '/admin/document-requirements',
  '/admin/scorecards',
  '/admin/templates',
  '/admin/notification-templates',
  '/admin/forms',
  '/admin/policies',
  '/admin/tasks',
  '/admin/preboarding-packages',
  '/admin/configuration-releases',
  // Compatibility routes now take HR straight to the relevant workspace.
  '/admin/assessment-bank',
  '/admin/interview-questions',
]

export async function proxy(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID()
  const { pathname } = req.nextUrl
  const isApi = pathname.startsWith('/api')
  const session = await readSession(req)
  const roles = session?.roles ?? []

  const deny = (status: number, redirectTo: string) => {
    if (isApi) {
      const response = NextResponse.json({ error: status === 401 ? 'Unauthorized' : 'Forbidden' }, { status })
      response.headers.set('x-request-id', requestId)
      return response
    }
    const location = `${redirectTo}?${new URLSearchParams({ next: pathname })}`
    const host = req.headers.get('host')
    const safeHost = host && /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host) ? host : null
    const forwardedProtocol = req.headers.get('x-forwarded-proto')?.toLowerCase()
    const protocol =
      forwardedProtocol === 'http' || forwardedProtocol === 'https'
        ? forwardedProtocol
        : new URL(req.url).protocol.replace(':', '')
    // Build the absolute URL from the validated request host rather than
    // nextUrl's internal server hostname.
    const url = new URL(location, safeHost ? `${protocol}://${safeHost}` : req.url)
    const response = NextResponse.redirect(url, 307)
    response.headers.set('x-request-id', requestId)
    return response
  }

  const needsAuth = isCandidateArea(pathname) || isStaffArea(pathname)
  if (needsAuth && !session) return deny(401, '/auth/login')

  const isAdmin = roles.includes('SYSTEM_ADMIN')
  const isCourseAdmin = roles.includes('COURSE_ADMIN')
  const isHrManager = roles.includes('HR_MANAGER')
  const isRecruitmentOfficer = roles.includes('RECRUITMENT_OFFICER')

  if (isStaffArea(pathname)) {
    const isStaff = hasStaffRole(roles)
    if (!isStaff) return deny(403, '/candidate/dashboard')
    const isRecruitmentArea = pathname.startsWith('/recruitment') || pathname.startsWith('/api/recruitment')
    const isAuditPage = pathname === '/recruitment/audit'
    if (isAdmin && isRecruitmentArea && !isAuditPage) {
      return deny(403, '/admin/system-settings')
    }
    if (isAdminArea(pathname) && isAdmin) {
      if (pathname !== '/admin' && !matchesRoute(pathname, SYSTEM_ADMIN_ROUTES)) {
        return deny(403, '/admin/system-settings')
      }
    } else if (isAdminArea(pathname)) {
      // Reference data (contract types, document types, departments…) is read
      // through this endpoint by ordinary staff forms; the handler itself
      // distinguishes reads from writes, so any staff member may reach it.
      const staffReferenceDataPath = pathname === '/api/admin/generic'
      const courseAdminPath =
        pathname === '/admin/courses' ||
        pathname.startsWith('/admin/courses/') ||
        pathname === '/admin/configuration-releases' ||
        pathname === '/api/admin/generic' ||
        pathname === '/api/admin/configuration-releases' ||
        pathname.startsWith('/api/admin/configuration-builder')
      const recruitmentOperationsPath =
        pathname === '/admin/automations' ||
        pathname === '/api/admin/automations' ||
        pathname === '/admin/fraud-reports' ||
        pathname === '/api/admin/fraud-reports'
      const hrManagerPath =
        recruitmentOperationsPath ||
        matchesRoute(pathname, RECRUITMENT_SETUP_ROUTES) ||
        pathname === '/api/admin/configuration-releases' ||
        pathname.startsWith('/api/admin/configuration-builder')
      if (
        !staffReferenceDataPath &&
        !(isCourseAdmin && courseAdminPath) &&
        !(isHrManager && hrManagerPath) &&
        !(isRecruitmentOfficer && recruitmentOperationsPath)
      ) {
        return deny(403, '/recruitment/dashboard')
      }
    }
  }

  if (isCandidateArea(pathname)) {
    const isCandidate = roles.includes('CANDIDATE') && !isAdmin
    if (!isCandidate) return deny(403, '/recruitment/dashboard')
  }

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-request-id', requestId)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('x-request-id', requestId)
  return response
}

export const config = {
  matcher: [
    '/candidate/:path*',
    '/recruitment/:path*',
    '/admin/:path*',
    '/api/candidate/:path*',
    '/api/recruitment/:path*',
    '/api/admin/:path*',
  ],
}
