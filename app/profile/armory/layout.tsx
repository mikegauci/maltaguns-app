import { requireArmoryContext } from '@/lib/armory/auth'

export default async function ArmoryRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireArmoryContext()
  return children
}
