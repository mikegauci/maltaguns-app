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
      <SectionCard>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={onSubmit} className="max-w-xl space-y-4">
          <FormField label="Company name">
            <Input name="companyName" required />
          </FormField>
          <FormField label="Licence holder full name">
            <Input
              name="contactName"
              required
              placeholder="First and last name on the dealer licence"
            />
          </FormField>
          <FormField label="Phone number">
            <Input name="phoneNumber" required />
          </FormField>
          <FormField label="Dealer licence number">
            <Input
              name="dealerLicenceNumber"
              required
              placeholder="SB/WO/00000/2010"
            />
          </FormField>
          <FormField label="Licence expiry date">
            <Input name="dealerLicenceExpiry" type="date" required />
          </FormField>
          <Button type="submit" disabled={pending}>
            {pending ? 'Submitting…' : 'Submit registration'}
          </Button>
        </form>
      </SectionCard>
    </ProfilePageLayout>
  )
}
