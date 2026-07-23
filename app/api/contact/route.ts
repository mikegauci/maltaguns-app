import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { escapeHtml } from '@/lib/escape-html'

const resend = new Resend(process.env.RESEND_API_KEY)

const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  email: z.string().email('Invalid email address').max(320),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = contactFormSchema.parse(body)

    const name = escapeHtml(validatedData.name)
    const email = escapeHtml(validatedData.email)
    const subject = escapeHtml(validatedData.subject)
    const message = escapeHtml(validatedData.message).replace(/\n/g, '<br>')

    const { data, error } = await resend.emails.send({
      from: 'MaltaGuns Contact Form <contact@maltaguns.com>',
      to: ['support@maltaguns.com'],
      subject: `Contact Form: ${validatedData.subject.slice(0, 200)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
          </div>
          
          <div style="margin: 20px 0;">
            <p><strong>Message:</strong></p>
            <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #007bff; margin-top: 10px;">
              ${message}
            </div>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            This email was sent from the MaltaGuns contact form.
          </p>
        </div>
      `,
      replyTo: validatedData.email,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Email sent successfully', id: data?.id },
      { status: 200 }
    )
  } catch (error) {
    console.error('Contact form error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid form data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
