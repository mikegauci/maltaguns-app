'use client'

import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { ContactInformation, ContactForm } from '@/components/contact'
import { useContactForm } from '../../hooks/useContactForm'

export default function ContactPage() {
  const { form, isSubmitting, onSubmit } = useContactForm()

  return (
    <PageLayout>
      <PageHeader
        title="Contact Us"
        description="Have a question or feedback? We'd love to hear from you. Fill out the form below and our team will get back to you as soon as possible."
        className="mb-12"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mx-auto">
        <div className="md:col-span-1 space-y-6">
          <ContactInformation />
        </div>

        <div className="md:col-span-2">
          <ContactForm
            form={form}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </PageLayout>
  )
}
