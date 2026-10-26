import { redirect } from 'next/navigation'
import { getArmoryContext } from '@/lib/armory/auth'
import { RegisterForm } from './register-form'

export default async function RegisterPage() {
  const ctx = await getArmoryContext()
  if (ctx?.dealerAccount) {
    redirect('/profile/armory/company-profile')
  }
  return <RegisterForm />
}
