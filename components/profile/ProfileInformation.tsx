'use client'

import { UseFormReturn } from 'react-hook-form'
import { AppCard } from '@/components/design-system'
import { Button } from '@/components/ui/button'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { normalizeBirthdayForInput } from '@/lib/format'
import { Pencil } from 'lucide-react'
import { Profile, ProfileForm } from '../../app/profile/types'
import { NotificationPreferences } from './NotificationPreferences'

interface ProfileInformationProps {
  profile: Profile
  isEditing: boolean
  setIsEditing: (value: boolean) => void
  form: UseFormReturn<ProfileForm>
  onSubmit: (data: ProfileForm) => Promise<void>
}

function SpecField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  )
}

export const ProfileInformation = ({
  profile,
  isEditing,
  setIsEditing,
  form,
  onSubmit,
}: ProfileInformationProps) => {
  return (
    <AppCard>
      <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="app-display mb-2 text-lg uppercase tracking-tight sm:mb-0">
            Profile Information
          </CardTitle>
          <CardDescription>
            Your personal information and account details
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
          className="w-full shrink-0 sm:w-auto"
        >
          <Pencil className="mr-2 h-4 w-4" />
          {isEditing ? 'Cancel' : 'Edit'}
        </Button>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John"
                          disabled={profile.identity_verified}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Doe"
                          disabled={profile.identity_verified}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthday"
                  render={({ field }) => {
                    const today = new Date()
                    const maxDate = new Date(today)
                    maxDate.setFullYear(today.getFullYear() - 18)

                    const minDate = new Date(today)
                    minDate.setFullYear(today.getFullYear() - 100)

                    return (
                      <FormItem>
                        <FormLabel>Date of birth</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            max={maxDate.toISOString().split('T')[0]}
                            min={minDate.toISOString().split('T')[0]}
                            {...field}
                            value={normalizeBirthdayForInput(field.value)}
                            onChange={e => {
                              field.onChange(e)
                              form.trigger('birthday')
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+356 1234 5678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St, Valletta" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit">Save Changes</Button>
            </form>
          </Form>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SpecField
              label="Username"
              value={profile.username || 'Not provided'}
            />
            <SpecField label="Email" value={profile.email || 'Not provided'} />
            <SpecField
              label="First Name"
              value={profile.first_name || 'Not provided'}
            />
            <SpecField
              label="Last Name"
              value={profile.last_name || 'Not provided'}
            />
            <SpecField
              label="Date of birth"
              value={profile.birthday || 'Not provided'}
            />
            <SpecField label="Phone" value={profile.phone || 'Not provided'} />
            <div className="md:col-span-2">
              <SpecField
                label="Address"
                value={profile.address || 'Not provided'}
              />
            </div>
          </div>
        )}

        <div className="mt-6">
          <NotificationPreferences profile={profile} />
        </div>
      </CardContent>
    </AppCard>
  )
}
