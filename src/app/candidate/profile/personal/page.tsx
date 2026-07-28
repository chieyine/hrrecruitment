'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Link from 'next/link'
import { ArrowLeft, Save, CheckCircle } from 'lucide-react'

export default function PersonalDetailsPage() {
  const [formData, setFormData] = useState({
    legalFirstName: '',
    middleName: '',
    lastName: '',
    preferredName: '',
    nationality: 'Nigerian',
    countryOfResidence: 'Nigeria',
    state: '',
    lga: '',
    city: '',
    address: '',
    primaryPhone: '',
    alternatePhone: '',
    preferredContactMethod: 'EMAIL',
    willingnessToRelocate: false,
    earliestStartDate: '',
    preferredDutyLocations: [] as string[],
  })
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/candidate/profile')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Unable to load your profile')
        if (data.profile) {
          setFormData((prev) => ({
            ...prev,
            ...data.profile,
            earliestStartDate: data.profile.earliestStartDate
              ? new Date(data.profile.earliestStartDate).toISOString().slice(0, 10)
              : '',
            preferredDutyLocations: (() => {
              try {
                return JSON.parse(data.profile.preferredDutyLocationsJson || '[]')
              } catch {
                return []
              }
            })(),
          }))
        }
        return data
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load your profile'))
      .finally(() => setProfileLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/candidate/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, earliestStartDate: formData.earliestStartDate || null }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to update personal information')
      setMessage('Changes saved.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update personal information')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Header />
      <main id="main-content" className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/candidate/profile" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Personal details</h1>
            <p className="text-slate-600 text-sm">Names, contact details and availability.</p>
          </div>
        </div>

        {message && (
          <div
            role="status"
            className="mb-6 p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            {message}
          </div>
        )}
        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        )}

        {profileLoading ? (
          <div role="status" className="rounded-xl border bg-white p-8 text-sm text-slate-600">
            Loading your profile…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="legalFirstName" className="block text-sm font-medium text-slate-700 mb-1">
                  Legal First Name *
                </label>
                <input
                  id="legalFirstName"
                  type="text"
                  required
                  value={formData.legalFirstName}
                  onChange={(e) => setFormData({ ...formData, legalFirstName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="middleName" className="block text-sm font-medium text-slate-700 mb-1">
                  Middle Name
                </label>
                <input
                  id="middleName"
                  type="text"
                  value={formData.middleName || ''}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1">
                  Last Name *
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="preferredName" className="block text-sm font-medium text-slate-700 mb-1">
                  Preferred Name
                </label>
                <input
                  id="preferredName"
                  value={formData.preferredName || ''}
                  onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="nationality" className="block text-sm font-medium text-slate-700 mb-1">
                  Nationality
                </label>
                <input
                  id="nationality"
                  value={formData.nationality || ''}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="countryOfResidence" className="block text-sm font-medium text-slate-700 mb-1">
                  Country of Residence
                </label>
                <input
                  id="countryOfResidence"
                  value={formData.countryOfResidence || ''}
                  onChange={(e) => setFormData({ ...formData, countryOfResidence: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="primaryPhone" className="block text-sm font-medium text-slate-700 mb-1">
                  Primary Phone *
                </label>
                <input
                  id="primaryPhone"
                  type="tel"
                  required
                  value={formData.primaryPhone || ''}
                  onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
                  placeholder="+234 800 000 0000"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="alternatePhone" className="block text-sm font-medium text-slate-700 mb-1">
                  Alternative Phone
                </label>
                <input
                  id="alternatePhone"
                  type="tel"
                  value={formData.alternatePhone || ''}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-1">
                  State of Residence
                </label>
                <input
                  id="state"
                  type="text"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="FCT - Abuja"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="lga" className="block text-sm font-medium text-slate-700 mb-1">
                  LGA
                </label>
                <input
                  id="lga"
                  type="text"
                  value={formData.lga || ''}
                  onChange={(e) => setFormData({ ...formData, lga: e.target.value })}
                  placeholder="Abuja Municipal"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-1">
                  City / Town
                </label>
                <input
                  id="city"
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">
                Residential Address
              </label>
              <textarea
                id="address"
                rows={2}
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label htmlFor="preferredContactMethod" className="text-sm font-medium text-slate-700">
                Preferred Contact Method
                <select
                  id="preferredContactMethod"
                  value={formData.preferredContactMethod || 'EMAIL'}
                  onChange={(e) => setFormData({ ...formData, preferredContactMethod: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2"
                >
                  <option value="EMAIL">Email</option>
                  <option value="PHONE">Phone</option>
                  <option value="SMS">SMS</option>
                </select>
              </label>
              <label htmlFor="earliestStartDate" className="text-sm font-medium text-slate-700">
                Earliest Available Start Date
                <input
                  id="earliestStartDate"
                  type="date"
                  value={formData.earliestStartDate || ''}
                  onChange={(e) => setFormData({ ...formData, earliestStartDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2"
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="relocate"
                checked={formData.willingnessToRelocate}
                onChange={(e) => setFormData({ ...formData, willingnessToRelocate: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <label htmlFor="relocate" className="text-sm text-slate-700">
                Willing to relocate to field duty stations
              </label>
            </div>
            <label htmlFor="preferredDutyLocations" className="block text-sm font-medium text-slate-700">
              Preferred duty locations
              <input
                id="preferredDutyLocations"
                value={formData.preferredDutyLocations.join(', ')}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    preferredDutyLocations: event.target.value
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="For example: Abuja, Maiduguri, Yola"
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2"
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">Separate locations with commas.</span>
            </label>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2.5 rounded-lg transition"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Personal Details'}
              </button>
            </div>
          </form>
        )}
      </main>
      <Footer />
    </div>
  )
}
