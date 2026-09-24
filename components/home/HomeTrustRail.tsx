import { ShieldCheck, MapPin, Users } from 'lucide-react'

const signals = [
  {
    icon: ShieldCheck,
    label: 'Verified sellers',
    detail: 'Identity-checked members',
  },
  {
    icon: MapPin,
    label: 'Malta-focused',
    detail: 'Island-wide listings and dealers',
  },
  {
    icon: Users,
    label: 'Active community',
    detail: 'Marketplace, events, establishments',
  },
]

export function HomeTrustRail() {
  return (
    <div className="mt-10 lg:mt-14 rounded-sm border border-white/15 bg-black/80 px-4 py-5 backdrop-blur-sm sm:px-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
        {signals.map(({ icon: Icon, label, detail }) => (
          <div key={label} className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-white/20 bg-white/10">
              <Icon
                className="h-4 w-4 text-[var(--home-brand)]"
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="text-xs text-zinc-200 mt-0.5">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
