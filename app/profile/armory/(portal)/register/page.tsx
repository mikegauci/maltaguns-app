'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { SectionCard } from '@/components/armory/section-card'
import { FormField } from '@/components/armory/form-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function RegisterPage() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const body = {
      companyName: fd.get('companyName'),
      contactName: fd.get('contactName'),
      phoneNumber: fd.get('phoneNumber'),
      dealerLicenceNumber: fd.get('dealerLicenceNumber'),
      dealerLicenceExpiry: fd.get('dealerLicenceExpiry'),
    }
    const res = await fetch('/api/armory/dealer/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setPending(false)
    if (!res.ok) {
      setError(data.error ?? 'Registration failed')
      return
    }
    router.push('/profile/armory')
    router.refresh()
  }

  return (
    <ProfilePageLayout
      title="Register as a dealership"
      description="Apply for the full Armory dealer dashboard. Your licence will be verified by platform admin."
    >
      <SectionCard className="max-w-2xl">
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-900">
            After you submit, our team will verify your dealer licence. You can
            complete your company profile while you wait; full dashboard access
            unlocks once approved.
          </AlertDescription>
        </Alert>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">
              Company details
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Company name" className="sm:col-span-2">
                <Input
                  name="companyName"
                  required
                  autoComplete="organization"
                />
              </FormField>
              <FormField label="Licence holder full name">
                <Input
                  name="contactName"
                  required
                  autoComplete="name"
                  placeholder="First and last name on the dealer licence"
                />
              </FormField>
              <FormField label="Phone number">
                <Input
                  name="phoneNumber"
                  type="tel"
                  required
                  autoComplete="tel"
                />
              </FormField>
            </div>
          </div>
          <div className="space-y-4 border-t pt-6">
            <h2 className="text-lg font-semibold tracking-tight">
              Dealer licence
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                label="Dealer licence number"
                hint="As printed on your Malta dealer licence"
              >
                <Input
                  name="dealerLicenceNumber"
                  required
                  placeholder="SB/WO/00000/2010"
                />
              </FormField>
              <FormField label="Licence expiry date">
                <Input name="dealerLicenceExpiry" type="date" required />
              </FormField>
            </div>
          </div>
          <div className="flex justify-end border-t pt-4">
            <Button type="submit" disabled={pending}>
              {pending ? 'Submitting…' : 'Submit registration'}
            </Button>
          </div>
        </form>
      </SectionCard>
    </ProfilePageLayout>
  )
}
