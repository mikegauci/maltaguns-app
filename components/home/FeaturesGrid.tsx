import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Shield, Users } from 'lucide-react'
import Image from 'next/image'

export const FeaturesGrid = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            Go-To Platform for Firearms Enthusiasts
          </h2>
          <p className="text-lg text-muted-foreground">
            MaltaGuns is your <strong>one-stop platform</strong> for
            everything related to firearms.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card>
            <CardContent className="p-6">
              <div className="rounded-lg bg-[#cb0e0e] p-3 w-12 h-12 flex items-center justify-center mb-4">
                <Image
                  src="/images/pistol-gun-icon-white.svg"
                  alt="Firearms Marketplace"
                  width={24}
                  height={24}
                  className="text-white"
                />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                Firearms Marketplace
              </h3>
              <p className="text-muted-foreground">
                Buy and sell firearms and accessories securely with verified
                licensed sellers on a trusted platform.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="rounded-lg bg-[#cb0e0e] p-3 w-12 h-12 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Verified Sellers</h3>
              <p className="text-muted-foreground">
                Only trusted and licensed sellers can list items, ensuring
                safe and reliable buyer transactions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="rounded-lg bg-[#cb0e0e] p-3 w-12 h-12 flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Events</h3>
              <p className="text-muted-foreground">
                Join local shooting, training, and exhibition events and
                competitions to improve your skills and connect with fellow
                enthusiasts.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="rounded-lg bg-[#cb0e0e] p-3 w-12 h-12 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Community</h3>
              <p className="text-muted-foreground">
                Engage with other firearm enthusiasts, share knowledge, and
                learn from each other in a supportive environment.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

