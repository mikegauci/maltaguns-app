'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { Profile } from '../../app/profile/types'

interface NotificationPreferencesProps {
  profile: Profile
}

export const NotificationPreferences = ({
  profile,
}: NotificationPreferencesProps) => {
  const { supabase, session } = useSupabase()
  const { toast } = useToast()

  // The switch is "on" when the user wants the emails, i.e. not opted out.
  const [emailEnabled, setEmailEnabled] = useState(
    !profile.article_email_opt_out
  )
  const [saving, setSaving] = useState(false)

  async function handleToggle(checked: boolean) {
    const userId = session?.user?.id
    if (!userId) return

    setSaving(true)
    setEmailEnabled(checked)

    const { error } = await supabase
      .from('profiles')
      .update({ article_email_opt_out: !checked })
      .eq('id', userId)

    setSaving(false)

    if (error) {
      setEmailEnabled(!checked)
      toast({
        variant: 'destructive',
        title: 'Could not save',
        description: 'Please try again.',
      })
      return
    }

    toast({
      title: 'Preferences saved',
      description: checked
        ? 'You will receive an email when a new article is published.'
        : "You won't receive new article emails. You'll still see them in your notifications.",
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
        <CardDescription>
          Choose which emails you receive from MaltaGuns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="font-medium">New article published</div>
            <p className="text-sm text-muted-foreground">
              Email me when a new article is published. New articles always
              appear in your on-site notifications.
            </p>
          </div>
          <Switch
            checked={emailEnabled}
            onCheckedChange={handleToggle}
            disabled={saving}
            aria-label="Email me when a new article is published"
          />
        </div>
      </CardContent>
    </Card>
  )
}
