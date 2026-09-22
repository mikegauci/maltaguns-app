'use server'

import {
  requireApprovedDealer,
  requireDealerAccount,
  type ArmoryApprovedDealerContext,
  type ArmoryDealerContext,
} from '@/lib/armory/auth'
import { ActionError } from './action-utils'

export async function dealerAccountCtx(): Promise<ArmoryDealerContext> {
  return requireDealerAccount()
}

export async function dealerCtx(): Promise<ArmoryApprovedDealerContext> {
  return requireApprovedDealer()
}

export async function ownerAccountCtx(): Promise<
  ArmoryDealerContext & { staffRole: 'owner' }
> {
  const ctx = await dealerAccountCtx()
  if (ctx.staffRole !== 'owner')
    throw new ActionError('Only the account owner can do this')
  return ctx as ArmoryDealerContext & { staffRole: 'owner' }
}

export async function ownerCtx(): Promise<
  ArmoryApprovedDealerContext & { staffRole: 'owner' }
> {
  const ctx = await dealerCtx()
  if (ctx.staffRole !== 'owner')
    throw new ActionError('Only the account owner can do this')
  return ctx as ArmoryApprovedDealerContext & { staffRole: 'owner' }
}
