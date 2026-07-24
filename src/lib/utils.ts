import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "N/A"
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "N/A"
  const d = new Date(dateStr)
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function getStatusBadgeClass(status: string): string {
  switch (status?.toUpperCase()) {
    case "OPEN":
    case "APPROVED":
    case "ACCEPTED":
    case "READY_TO_RESUME":
    case "PASSED":
    case "COMPLETED":
    case "CLEAN":
    case "CREATED_IN_ERP":
      return "bg-emerald-100 text-emerald-800 border-emerald-300"
    case "SUBMITTED":
    case "APPLICATION_RECEIVED":
    case "UNDER_REVIEW":
    case "LONGLISTED":
    case "SHORTLISTED":
    case "ASSESSMENT_INVITED":
    case "INTERVIEW_INVITED":
    case "IN_PROGRESS":
      return "bg-sky-100 text-sky-800 border-sky-300"
    case "DRAFT":
    case "APPLICATION_DRAFT":
    case "PENDING":
    case "SCHEDULED":
      return "bg-amber-100 text-amber-800 border-amber-300"
    case "REJECTED":
    case "INELIGIBLE":
    case "FAILED":
    case "DECLINED":
    case "CANCELLED":
    case "EXPIRED":
    case "NOT_SELECTED":
      return "bg-rose-100 text-rose-800 border-rose-300"
    case "OFFER_SENT":
    case "RECOMMENDED":
      return "bg-purple-100 text-purple-800 border-purple-300"
    default:
      return "bg-slate-100 text-slate-800 border-slate-300"
  }
}
