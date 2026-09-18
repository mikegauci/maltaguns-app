import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

interface NavigationHandlerDependencies {
  router: AppRouterInstance
  isSeller: boolean
  isVerified: boolean
  isIdentityVerified: boolean
  hasLicense: boolean
  setShowLicenseDialog: (show: boolean) => void
  setDialogMessage: (message: { title: string; description: string }) => void
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

  function handleFirearmsClick() {
    // Check if user has neither a verified identity nor a license
    if (!isIdentityVerified && !hasLicense) {
      setDialogMessage({
        title: 'Identity & License Required',
        description:
          'To sell firearms, you must verify your identity and upload your firearms license. Please go to your profile to complete both in the Seller Status section.',
      })
      setShowLicenseDialog(true)
      return
    }

    // Check if identity is verified but no license was uploaded
    if (isIdentityVerified && !hasLicense) {
      setDialogMessage({
        title: 'Firearms License Required',
        description:
          'Your identity is verified, but you still need to upload your firearms license. Please go to your profile and upload a valid license in the Seller Status section.',
      })
      setShowLicenseDialog(true)
      return
    }

    // Check if a license was uploaded but the identity is not verified
    if (hasLicense && !isIdentityVerified) {
      setDialogMessage({
        title: 'Identity Verification Required',
        description:
          'You have uploaded your firearms license, but you still need to verify your identity. Please go to your profile and complete identity verification in the Seller Status section.',
      })
      setShowLicenseDialog(true)
      return
    }

    // Check if license is not verified (uploaded but failed OCR or expired)
    if (hasLicense && !isVerified) {
      setDialogMessage({
        title: 'License Verification Failed',
        description:
          'Your firearms license could not be verified. This may be because it has expired, the image quality is poor, or the name does not match your profile. Please upload a clear photo of a valid, current license.',
      })
      setShowLicenseDialog(true)
      return
    }

    // Check if user is a seller
    if (!isSeller) {
      setDialogMessage({
        title: 'Seller Account Required',
        description:
          'To sell firearms on Maltaguns, you need a verified seller account. Go to your profile to verify your identity and upload your firearms license.',
      })
      setShowLicenseDialog(true)
      return
    }

    // All checks passed, proceed to firearms listing creation
    router.push('/marketplace/create/firearms')
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
