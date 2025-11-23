'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { BookOpen, HelpCircle, AlertCircle, FileText } from 'lucide-react'
import Link from 'next/link'

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight">Help Center</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Find guides, tutorials, FAQs, and support resources to help you get
            the most out of MaltaGuns.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="getting-started" className="mb-12">
            <TabsList className="flex flex-col sm:grid sm:grid-cols-5 w-full h-full sm:h-auto gap-2 sm:gap-0">
              <TabsTrigger className="w-full" value="getting-started">
                Getting Started
              </TabsTrigger>
              <TabsTrigger className="w-full" value="marketplace">
                Marketplace
              </TabsTrigger>
              <TabsTrigger className="w-full" value="regulations">
                Regulations
              </TabsTrigger>
              <TabsTrigger className="w-full" value="account">
                Account
              </TabsTrigger>
              <TabsTrigger className="w-full" value="troubleshooting">
                Troubleshooting
              </TabsTrigger>
            </TabsList>

            {/* Getting Started Section */}
            <TabsContent value="getting-started" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Getting Started with MaltaGuns</CardTitle>
                  <CardDescription>
                    Learn how to make the most of our platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="border rounded-lg p-5 hover:border-primary transition-colors">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-semibold">Creating Your Account</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Learn how to set up your MaltaGuns account and customize
                        your profile.
                      </p>
                      <Link href="/help/creating-account">
                        <Button variant="outline" size="sm">
                          View Guide
                        </Button>
                      </Link>
                    </div>

                    <div className="border rounded-lg p-5 hover:border-primary transition-colors">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-semibold">
                          Browsing the Marketplace
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Discover how to search, filter, and find the best
                        listings on our marketplace.
                      </p>
                      <Link href="/help/using-marketplace">
                        <Button variant="outline" size="sm">
                          View Guide
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="what-is-maltaguns">
                      <AccordionTrigger>What is MaltaGuns?</AccordionTrigger>
                      <AccordionContent>
                        MaltaGuns is Malta's premier online platform for the
                        firearms community. We provide a marketplace for buying
                        and selling firearms and accessories, a directory of
                        local retailers, information about events, and expert
                        articles about firearms and shooting sports.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="membership-cost">
                      <AccordionTrigger>
                        Does it cost anything to be a member?
                      </AccordionTrigger>
                      <AccordionContent>
                        Basic membership to MaltaGuns is completely free. You
                        can browse listings, read articles, and view events
                        without any cost. We do offer premium features for
                        sellers, which come with a small fee to help support our
                        platform.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="community-guidelines">
                      <AccordionTrigger>
                        What are the community guidelines?
                      </AccordionTrigger>
                      <AccordionContent>
                        Our community guidelines promote respectful interaction,
                        legal compliance, and safety. We prohibit harassment,
                        illegal activity, and misrepresentation. All firearms
                        listings must comply with Maltese law, and sellers must
                        have proper licensing. For full details, please refer to
                        our{' '}
                        <a
                          href="/terms"
                          className="text-primary hover:underline"
                        >
                          Terms of Service
                        </a>
                        .
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Marketplace Section */}
            <TabsContent value="marketplace" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Marketplace Help</CardTitle>
                  <CardDescription>
                    Information about buying and selling on MaltaGuns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="border rounded-lg p-5 hover:border-primary transition-colors">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-semibold">Creating a Listing</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Step-by-step guide on how to create effective listings
                        that sell quickly.
                      </p>
                      <Link href="/help/creating-listings">
                        <Button variant="outline" size="sm">
                          View Guide
                        </Button>
                      </Link>
                    </div>

                    <div className="border rounded-lg p-5 hover:border-primary transition-colors">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-semibold">Safe Transactions</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Learn how to conduct safe and legal transactions through
                        our platform.
                      </p>
                      <Link href="/help/safe-transactions">
                        <Button variant="outline" size="sm">
                          View Guide
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="how-to-sell">
                      <AccordionTrigger>
                        How do I list an item for sale?
                      </AccordionTrigger>
                      <AccordionContent>
                        To sell an item, you need to first create an account and
                        verify your seller status. Once approved, you can click
                        on "Post Listing" from your dashboard or the marketplace
                        page. Fill out the listing details with accurate
                        information and photos of your item. Your listing will
                        be reviewed before going live.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="seller-verification">
                      <AccordionTrigger>
                        How does seller verification work?
                      </AccordionTrigger>
                      <AccordionContent>
                        Seller verification requires uploading a valid firearms
                        license or dealer permit. Our team reviews these
                        documents to ensure compliance with Maltese laws. This
                        helps maintain a safe and legal marketplace for all
                        users. Verification typically takes 1-2 business days.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="buying-fees">
                      <AccordionTrigger>
                        Are there any fees for buyers?
                      </AccordionTrigger>
                      <AccordionContent>
                        There are no fees for buyers using the MaltaGuns
                        marketplace. We only charge a small commission to
                        sellers for successful transactions, which helps us
                        maintain the platform and provide a quality service.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="featured-listings">
                      <AccordionTrigger>
                        How do featured listings work?
                      </AccordionTrigger>
                      <AccordionContent>
                        Featured listings receive premium placement at the top
                        of search results and on the homepage. To feature your
                        listing, navigate to your active listing, click "Promote
                        Listing," and select a featuring duration. Featuring a
                        listing costs €5 for 7 days, €8 for 14 days, or €12 for
                        30 days.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Regulations Section */}
            <TabsContent value="regulations" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Firearms Regulations</CardTitle>
                  <CardDescription>
                    Information about Maltese firearms laws and regulations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 mb-6">
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      <strong>Disclaimer:</strong> This information is provided
                      as a general guide only and should not be considered legal
                      advice. Always consult with local authorities or a legal
                      professional for the most current and accurate information
                      regarding firearms regulations.
                    </p>
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="license-requirements">
                      <AccordionTrigger>
                        What licenses do I need to own a firearm in Malta?
                      </AccordionTrigger>
                      <AccordionContent>
                        In Malta, you need a Category B license for most
                        firearms, which requires completing a firearms safety
                        course, passing a background check, and demonstrating a
                        legitimate reason for ownership, such as sport shooting
                        or collecting. Different license types exist for
                        different weapon categories, and requirements vary
                        accordingly.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="buying-process">
                      <AccordionTrigger>
                        What is the legal process for buying a firearm?
                      </AccordionTrigger>
                      <AccordionContent>
                        To legally purchase a firearm in Malta, you must first
                        obtain the appropriate license from the Police
                        Commissioner. Once you have your license, you can
                        purchase from a registered dealer or private seller. The
                        transaction must be registered with the authorities, and
                        the weapon must be transported safely and stored
                        securely according to regulations.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="storage-requirements">
                      <AccordionTrigger>
                        What are the storage requirements for firearms?
                      </AccordionTrigger>
                      <AccordionContent>
                        Maltese law requires firearms to be stored in an
                        approved gun safe that complies with specific security
                        standards. Ammunition must be stored separately from
                        firearms. Your storage arrangements may be inspected by
                        the police as part of the licensing process or during
                        random checks.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="transport-regulations">
                      <AccordionTrigger>
                        How should I transport my firearms?
                      </AccordionTrigger>
                      <AccordionContent>
                        When transporting firearms in Malta, they must be
                        unloaded and secured in a locked case or container.
                        Ammunition should be transported separately. You must
                        carry your firearms license with you, and transport
                        should be direct between authorized locations (e.g.,
                        residence, shooting range, gunsmith).
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account Section */}
            <TabsContent value="account" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Help</CardTitle>
                  <CardDescription>
                    Information about managing your MaltaGuns account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="change-password">
                      <AccordionTrigger>
                        How do I change my password?
                      </AccordionTrigger>
                      <AccordionContent>
                        You can change your password by going to your Profile
                        settings. Click on your profile icon, select "Profile,"
                        and then navigate to the "Security" tab. From there, you
                        can update your password. We recommend using a strong,
                        unique password for your account.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="delete-account">
                      <AccordionTrigger>
                        Can I delete my account?
                      </AccordionTrigger>
                      <AccordionContent>
                        Yes, you can delete your account by going to your
                        Profile settings, navigating to the "Account" tab, and
                        selecting "Delete Account." Please note that this action
                        is permanent and will remove all your data from our
                        system, including your listings and messages.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="email-notifications">
                      <AccordionTrigger>
                        How do I manage email notifications?
                      </AccordionTrigger>
                      <AccordionContent>
                        You can manage your email notification preferences in
                        your Profile settings under the "Notifications" tab.
                        From there, you can choose which types of emails you'd
                        like to receive, such as new listing alerts, messages,
                        and platform updates.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="update-profile">
                      <AccordionTrigger>
                        How do I update my profile information?
                      </AccordionTrigger>
                      <AccordionContent>
                        To update your profile information, go to your Profile
                        settings by clicking on your profile icon in the top
                        right corner. From there, you can edit your personal
                        details, contact information, and profile picture.
                        Remember to click "Save Changes" when you're done.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Troubleshooting Section */}
            <TabsContent value="troubleshooting" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Troubleshooting</CardTitle>
                  <CardDescription>
                    Solutions for common issues on MaltaGuns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="login-issues">
                      <AccordionTrigger>
                        I can't log in to my account
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-3">
                          If you're having trouble logging in, try these steps:
                        </p>
                        <ol className="list-decimal pl-5 space-y-2">
                          <li>
                            Check that you're using the correct email address
                            and password
                          </li>
                          <li>
                            Use the "Forgot Password" link to reset your
                            password
                          </li>
                          <li>
                            Clear your browser cookies and cache, then try again
                          </li>
                          <li>Try using a different browser or device</li>
                          <li>
                            If you still can't log in, contact our support team
                            for assistance
                          </li>
                        </ol>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="image-upload">
                      <AccordionTrigger>
                        I'm having trouble uploading images
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-3">
                          If you're experiencing issues uploading images, check
                          the following:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                          <li>
                            Make sure your image is in JPG, PNG, or WebP format
                          </li>
                          <li>Ensure each image is under 5MB in size</li>
                          <li>Check your internet connection</li>
                          <li>Try using a different browser or device</li>
                          <li>Compress your images if they're too large</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="payment-issues">
                      <AccordionTrigger>
                        My payment for a featured listing failed
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-3">
                          If your payment for a featured listing failed, try
                          these solutions:
                        </p>
                        <ol className="list-decimal pl-5 space-y-2">
                          <li>
                            Check that your payment card has sufficient funds
                          </li>
                          <li>
                            Verify that your card details are entered correctly
                          </li>
                          <li>
                            Ensure your card isn't expired or blocked for online
                            transactions
                          </li>
                          <li>Try a different payment method if available</li>
                          <li>
                            Wait a few minutes and try again, as the issue might
                            be temporary
                          </li>
                          <li>
                            If problems persist, contact your bank or our
                            support team
                          </li>
                        </ol>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="listing-not-visible">
                      <AccordionTrigger>
                        My listing isn't showing up
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-3">
                          If your listing isn't appearing, consider these
                          reasons:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                          <li>
                            New listings require approval and may take up to 24
                            hours to appear
                          </li>
                          <li>
                            Your listing might have been rejected for policy
                            violations (check your email)
                          </li>
                          <li>
                            Your seller verification might be pending or
                            incomplete
                          </li>
                          <li>
                            The listing might have expired (listings are active
                            for 30 days)
                          </li>
                          <li>
                            There might be a technical issue (try refreshing or
                            clearing cache)
                          </li>
                        </ul>
                        <p className="mt-3">
                          If none of these resolve your issue, please contact
                          our support team.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-12 mb-12">
            <Card>
              <CardHeader>
                <CardTitle>Resources</CardTitle>
                <CardDescription>
                  Additional support materials to help you use MaltaGuns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">User Guide</p>
                      <p className="text-sm text-muted-foreground">
                        Complete documentation for using MaltaGuns
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <HelpCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Video Tutorials</p>
                      <p className="text-sm text-muted-foreground">
                        Step-by-step video guides
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <AlertCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Community Forums</p>
                      <p className="text-sm text-muted-foreground">
                        Get help from other MaltaGuns members
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12 pt-8 border-t">
            <h2 className="text-2xl font-semibold mb-4">
              Can't find what you're looking for?
            </h2>
            <p className="text-muted-foreground mb-6">
              Our support team is ready to assist you with any questions or
              issues.
            </p>
            <Link href="/contact">
              <Button>Contact Support</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
