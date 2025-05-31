"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Mail, Phone } from "lucide-react"
import Script from "next/script"

export default function ContactPage() {
  return (
    <>
      {/* Freshdesk widget scripts */}
      <Script 
        src="https://s3.amazonaws.com/assets.freshdesk.com/widget/freshwidget.js" 
        strategy="afterInteractive"
      />
      
      <div className="min-h-screen bg-background py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight">Contact Us</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Have a question or feedback? We'd love to hear from you. Fill out the form below
              and our team will get back to you as soon as possible.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="md:col-span-1 space-y-6">
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
                        <p className="font-medium">+356 1234 5678</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card>
                <CardContent className="p-6">
                  {/* Freshdesk widget styles */}
                  <style jsx>{`
                    @import url(https://s3.amazonaws.com/assets.freshdesk.com/widget/freshwidget.css);
                    
                    .freshwidget-embedded-form {
                      border: none;
                      border-radius: 8px;
                      background: transparent;
                    }
                  `}</style>
                  
                  {/* Freshdesk embedded form */}
                  <iframe 
                    title="Feedback Form" 
                    className="freshwidget-embedded-form" 
                    id="freshwidget-embedded-form" 
                    src="https://maltaguns.freshdesk.com/widgets/feedback_widget/new?&widgetType=embedded&formTitle=Reach+out+to+us&submitTitle=Send+Message&searchArea=no" 
                    scrolling="no"
                    height="500px" 
                    width="100%" 
                    frameBorder="0"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 