'use client'

import { Suspense, useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

interface PaymentResultToastProps {
  successTitle: string
  successDescription: string
  onSuccess?: () => void
}

const MESSAGES = {
  processing: {
    title: 'Payment processing',
    description:
      'Your payment is being confirmed. It will appear on your account shortly.',
  },
  failed: {
    title: 'Payment not completed',
    description: 'Your payment did not go through. You have not been charged.',
  },
} as const

function PaymentResultToastInner({
  successTitle,
  successDescription,
  onSuccess,
}: PaymentResultToastProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const handled = useRef(false)

  useEffect(() => {
    const payment = searchParams.get('payment')
    if (!payment || handled.current) return
    handled.current = true

    if (payment === 'success') {
      toast({ title: successTitle, description: successDescription })
      onSuccess?.()
    } else if (payment === 'processing' || payment === 'failed') {
      toast({
        ...MESSAGES[payment],
        variant: payment === 'failed' ? 'destructive' : 'default',
      })
    }

    const params = new URLSearchParams(searchParams.toString())
    params.delete('payment')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [
    searchParams,
    router,
    pathname,
    toast,
    successTitle,
    successDescription,
    onSuccess,
  ])

  return null
}

/** Shows the outcome of a Vialet checkout based on the `?payment=` param. */
export function PaymentResultToast(props: PaymentResultToastProps) {
  return (
    <Suspense fallback={null}>
      <PaymentResultToastInner {...props} />
    </Suspense>
  )
}
