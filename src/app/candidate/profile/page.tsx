import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { GraduationCap, Briefcase, Award, ArrowLeft, FileText, Pencil } from 'lucide-react'
import ProfileAdditionalDetails from '@/components/shared/ProfileAdditionalDetails'
import { profileCompletion } from '@/lib/profile-completion'

export default async function CandidateProfilePage() {
  const user = await getVerifiedUser()

  if (!user) {
    redirect('/auth/login')
  }

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.userId },
    include: {
      education: true,
      employment: true,
      licences: true,
      documents: {
        include: { fileAsset: true },
      },
    },
  })
  const completion = profileCompletion(profile)

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />

      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link
            href="/candidate/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>

          {/* Profile Header Card */}
          <div className="rounded-2xl bg-white p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 mt-2 sm:text-3xl">
                  {profile?.legalFirstName} {profile?.middleName || ''} {profile?.lastName}
                </h1>
                <p className="text-xs text-slate-500">
                  {user.email} • {profile?.primaryPhone || 'No phone set'}
                </p>
              </div>

              <div className="flex flex-col items-end gap-3">
                <Link
                  href="/candidate/profile/personal"
                  className="inline-flex items-center rounded-xl bg-brand-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-800"
                >
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Edit personal details
                </Link>
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs space-y-1 text-right">
                  <span className="text-slate-500">Profile completeness</span>
                  <span className="block text-xl font-extrabold text-brand-600">{completion.percentage}%</span>
                  {completion.missing.length > 0 && (
                    <span className="block max-w-xs text-slate-500">
                      Still to add: {completion.missing.slice(0, 3).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <nav aria-label="Edit profile sections" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { href: '/candidate/profile/education', label: 'Education', icon: GraduationCap },
                { href: '/candidate/profile/employment', label: 'Employment', icon: Briefcase },
                { href: '/candidate/profile/licences', label: 'Licences', icon: Award },
                { href: '/candidate/profile/documents', label: 'Documents', icon: FileText },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 hover:border-brand-300 hover:bg-brand-50"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-brand-700" />
                    {label}
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
            </nav>

            {/* Personal Details */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                Personal details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="block text-slate-400">Nationality</span>
                  <span className="font-bold text-slate-900">{profile?.nationality || 'Not specified'}</span>
                </div>
                <div>
                  <span className="block text-slate-400">Country of residence</span>
                  <span className="font-bold text-slate-900">{profile?.countryOfResidence || 'Not specified'}</span>
                </div>
                <div>
                  <span className="block text-slate-400">State / LGA</span>
                  <span className="font-bold text-slate-900">
                    {profile?.state || 'N/A'} - {profile?.lga || ''}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400">Willing to relocate</span>
                  <span className="font-bold text-emerald-700">{profile?.willingnessToRelocate ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            {/* Education History */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-brand-600" /> Education
                </h3>
                <Link href="/candidate/profile/education" className="text-xs font-bold text-brand-700 hover:underline">
                  Edit education
                </Link>
              </div>

              {profile?.education.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No education records added yet.</p>
              ) : (
                <div className="space-y-3">
                  {profile?.education.map((edu) => (
                    <div key={edu.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {edu.qualification} in {edu.fieldOfStudy}
                      </h4>
                      <p className="text-slate-600 font-medium">
                        {edu.institution} ({edu.country})
                      </p>
                      <p className="text-slate-400">
                        {edu.startYear} - {edu.completionYear} {edu.grade ? `• Grade: ${edu.grade}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Employment History */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-purple-600" /> Employment
                </h3>
                <Link href="/candidate/profile/employment" className="text-xs font-bold text-brand-700 hover:underline">
                  Edit employment
                </Link>
              </div>

              {profile?.employment.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No employment records added yet.</p>
              ) : (
                <div className="space-y-3">
                  {profile?.employment.map((emp) => (
                    <div key={emp.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <h4 className="font-bold text-slate-900 text-sm">{emp.jobTitle}</h4>
                      <p className="text-slate-600 font-medium">
                        {emp.employer} ({emp.country})
                      </p>
                      <p className="text-slate-400">
                        {new Date(emp.startDate).getFullYear()} -{' '}
                        {emp.isCurrent ? 'Present' : emp.endDate ? new Date(emp.endDate).getFullYear() : ''}
                      </p>
                      {emp.responsibilities && (
                        <p className="text-slate-600 pt-1 border-t border-slate-200 mt-2">{emp.responsibilities}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Professional Licences & Certifications */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-600" /> Licences and certifications
                </h3>
                <Link href="/candidate/profile/licences" className="text-xs font-bold text-brand-700 hover:underline">
                  Edit licences
                </Link>
              </div>

              {profile?.licences.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No professional licences added yet.</p>
              ) : (
                <div className="space-y-3">
                  {profile?.licences.map((lic) => (
                    <div key={lic.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {lic.licenceType} - {lic.professionalBody}
                      </h4>
                      <p className="text-slate-600 font-mono">Licence Number: {lic.licenceNumber}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <ProfileAdditionalDetails />
        </div>
      </main>

      <Footer />
    </div>
  )
}
