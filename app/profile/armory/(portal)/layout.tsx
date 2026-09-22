import { requireArmoryContext } from '@/lib/armory/auth'
import { ArmoryShell, getArmoryNav } from '@/components/armory/ArmoryShell'

export default async function ArmoryPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await requireArmoryContext()
  const nav = getArmoryNav(ctx)
  return (
    <ArmoryShell ctx={ctx} nav={nav}>
      {children}
    </ArmoryShell>
  )
}
