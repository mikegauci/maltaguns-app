'use client'

import {
  BookOpen,
  Calendar,
  CreditCard,
  FileText,
  Package,
  Store,
  Trash2,
  Truck,
  Upload,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { ProfileNavIconKey } from '@/lib/profile-nav'

export const PROFILE_NAV_ICONS: Record<ProfileNavIconKey, LucideIcon> = {
  user: User,
  package: Package,
  'book-open': BookOpen,
  calendar: Calendar,
  store: Store,
  'credit-card': CreditCard,
  truck: Truck,
  users: Users,
  wallet: Wallet,
  'file-text': FileText,
  upload: Upload,
  trash: Trash2,
}
