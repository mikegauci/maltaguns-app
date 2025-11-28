import { Card, CardContent } from '@/components/ui/card'
import { Mail, Phone } from 'lucide-react'

export function ContactInformation() {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="font-semibold text-lg mb-4">Contact Information</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">info@maltaguns.com</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">+356 7723 3193</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
