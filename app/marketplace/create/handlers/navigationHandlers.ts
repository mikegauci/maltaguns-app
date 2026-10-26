import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

export type FirearmsSellGateInput = {
  isSeller: boolean
  isVerified: boolean
  isIdentityVerified: boolean
  hasLicense: boolean
}

export type FirearmsSellGateMessage = {
  title: string
  description: string
}

export function getFirearmsSellGateMessage(
  input: FirearmsSellGateInput
): FirearmsSellGateMessage | null {
  const { isSeller, isVerified, isIdentityVerified, hasLicense } = input

  if (!isIdentityVerified && !hasLicense) {
    return {
      title: 'Identity & License Required',
      description:
        'To sell firearms, you must verify your identity and upload your firearms license. Please go to your profile to complete both in the Seller Status section.',
    }
  }

  if (isIdentityVerified && !hasLicense) {
    return {
      title: 'Firearms License Required',
      description:
        'Your identity is verified, but you still need to upload your firearms license. Please go to your profile and upload a valid license in the Seller Status section.',
    }
  }

  if (hasLicense && !isIdentityVerified) {
    return {
      title: 'Identity Verification Required',
      description:
        'You have uploaded your firearms license, but you still need to verify your identity. Please go to your profile and complete identity verification in the Seller Status section.',
    }
  }

  if (hasLicense && !isVerified) {
    return {
      title: 'License Verification Failed',
      description:
        'Your firearms license could not be verified. This may be because it has expired, the image quality is poor, or the name does not match your profile. Please upload a clear photo of a valid, current license.',
    }
  }

  if (!isSeller) {
    return {
      title: 'Seller Account Required',
      description:
        'To sell firearms on Maltaguns, you need a verified seller account. Go to your profile to verify your identity and upload your firearms license.',
    }
  }

  return null
}

interface NavigationHandlerDependencies extends FirearmsSellGateInput {
  router: AppRouterInstance
  setShowLicenseDialog: (show: boolean) => void
  setDialogMessage: (message: FirearmsSellGateMessage) => void
}

export function createNavigationHandlers(deps: NavigationHandlerDependencies) {
  const {
    router,
    isSeller,
    isVerified,
    isIdentityVerified,
    hasLicense,
    setShowLicenseDialog,
    setDialogMessage,
  } = deps

  function handleFirearmsClick(destination = '/marketplace/create/firearms') {
    const gate = getFirearmsSellGateMessage({
      isSeller,
      isVerified,
      isIdentityVerified,
      hasLicense,
    })
    if (gate) {
      setDialogMessage(gate)
      setShowLicenseDialog(true)
      return
    }
    router.push(destination)
  }

  function handleNonFirearmsClick() {
    router.push('/marketplace/create/non-firearms')
  }

  function handleGoToProfile() {
    router.push('/profile')
  }

  return {
    handleFirearmsClick,
    handleNonFirearmsClick,
    handleGoToProfile,
  }
}
