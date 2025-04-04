"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight">Frequently Asked Questions</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions about MaltaGuns, firearms regulations in Malta, and how to use our platform.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="general" className="mb-12">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
              <TabsTrigger value="regulations">Regulations</TabsTrigger>
              <TabsTrigger value="account">Your Account</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>General Questions</CardTitle>
                  <CardDescription>Basic information about MaltaGuns and our services</CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="what-is-maltaguns">
                      <AccordionTrigger>What is MaltaGuns?</AccordionTrigger>
                      <AccordionContent>
                        MaltaGuns is Malta's premier online platform for the firearms community. We provide a marketplace for buying and selling firearms and accessories, a directory of local retailers, information about events, and expert articles about firearms and shooting sports.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="membership-cost">
                      <AccordionTrigger>Does it cost anything to be a member?</AccordionTrigger>
                      <AccordionContent>
                        Basic membership to MaltaGuns is completely free. You can browse listings, read articles, and view events without any cost. We do offer premium features for sellers, which come with a small fee to help support our platform.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="contact-support">
                      <AccordionTrigger>How can I contact support?</AccordionTrigger>
                      <AccordionContent>
                        You can reach our support team by visiting our <a href="/contact" className="text-primary hover:underline">Contact page</a>, emailing us directly at info@maltaguns.com, or calling us at +356 1234 5678 during business hours.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="marketplace" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Marketplace Questions</CardTitle>
                  <CardDescription>Information about buying and selling on MaltaGuns</CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="how-to-sell">
                      <AccordionTrigger>How do I list an item for sale?</AccordionTrigger>
                      <AccordionContent>
                        To sell an item, you need to first create an account and verify your seller status. Once approved, you can click on "Post Listing" from your dashboard or the marketplace page. Fill out the listing details with accurate information and photos of your item. Your listing will be reviewed before going live.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="seller-verification">
                      <AccordionTrigger>How does seller verification work?</AccordionTrigger>
                      <AccordionContent>
                        Seller verification requires uploading a valid firearms license or dealer permit. Our team reviews these documents to ensure compliance with Maltese laws. This helps maintain a safe and legal marketplace for all users. Verification typically takes 1-2 business days.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="buying-fees">
                      <AccordionTrigger>Are there any fees for buyers?</AccordionTrigger>
                      <AccordionContent>
                        There are no fees for buyers using the MaltaGuns marketplace. We only charge a small commission to sellers for successful transactions, which helps us maintain the platform and provide a quality service.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="regulations" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Firearms Regulations</CardTitle>
                  <CardDescription>Information about Maltese firearms laws and regulations</CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="license-requirements">
                      <AccordionTrigger>What licenses do I need to own a firearm in Malta?</AccordionTrigger>
                      <AccordionContent>
                        In Malta, you need a Category B license for most firearms, which requires completing a firearms safety course, passing a background check, and demonstrating a legitimate reason for ownership, such as sport shooting or collecting. Different license types exist for different weapon categories, and requirements vary accordingly.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="buying-process">
                      <AccordionTrigger>What is the legal process for buying a firearm?</AccordionTrigger>
                      <AccordionContent>
                        To legally purchase a firearm in Malta, you must first obtain the appropriate license from the Police Commissioner. Once you have your license, you can purchase from a registered dealer or private seller. The transaction must be registered with the authorities, and the weapon must be transported safely and stored securely according to regulations.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="storage-requirements">
                      <AccordionTrigger>What are the storage requirements for firearms?</AccordionTrigger>
                      <AccordionContent>
                        Maltese law requires firearms to be stored in an approved gun safe that complies with specific security standards. Ammunition must be stored separately from firearms. Your storage arrangements may be inspected by the police as part of the licensing process or during random checks.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="account" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Questions</CardTitle>
                  <CardDescription>Information about managing your MaltaGuns account</CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="change-password">
                      <AccordionTrigger>How do I change my password?</AccordionTrigger>
                      <AccordionContent>
                        You can change your password by going to your Profile settings. Click on your profile icon, select "Profile," and then navigate to the "Security" tab. From there, you can update your password. We recommend using a strong, unique password for your account.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="delete-account">
                      <AccordionTrigger>Can I delete my account?</AccordionTrigger>
                      <AccordionContent>
                        Yes, you can delete your account by going to your Profile settings, navigating to the "Account" tab, and selecting "Delete Account." Please note that this action is permanent and will remove all your data from our system, including your listings and messages.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="email-notifications">
                      <AccordionTrigger>How do I manage email notifications?</AccordionTrigger>
                      <AccordionContent>
                        You can manage your email notification preferences in your Profile settings under the "Notifications" tab. From there, you can choose which types of emails you'd like to receive, such as new listing alerts, messages, and platform updates.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="text-center mt-12 pt-8 border-t">
            <h2 className="text-2xl font-semibold mb-4">Still have questions?</h2>
            <p className="text-muted-foreground mb-6">
              Can't find the answer you're looking for? Please contact our support team.
            </p>
            <a href="/contact" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 