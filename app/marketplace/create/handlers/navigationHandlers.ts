import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

interface NavigationHandlerDependencies {
  router: AppRouterInstance
  isSeller: boolean
  isVerified: boolean
  isIdCardVerified: boolean
  hasLicense: boolean
  hasIdCard: boolean
  setShowLicenseDialog: (show: boolean) => void
  setDialogMessage: (message: { title: string; description: string }) => void
}

export function createNavigationHandlers(deps: NavigationHandlerDependencies) {
  const {
    router,
    isSeller,
    isVerified,
    isIdCardVerified,
    hasLicense,
    hasIdCard,
    setShowLicenseDialog,
    setDialogMessage,
  } = deps

  function handleFirearmsClick() {
    // Check if user is a seller
    if (!isSeller) {
      setDialogMessage({
        title: 'Seller Account Required',
        description:
          'To sell firearms on Maltaguns, you need to enable your seller account. Please go to your profile and upload ID card and license.',
      })
      setShowLicenseDialog(true)
      return
    }

    // Check if license is uploaded and verified
    if (!hasLicense || !isVerified) {
      setDialogMessage({
        title: 'License Verification Required',
        description:
          'To sell firearms on Maltaguns, you must upload and verify your firearms license. Please go to your profile and upload your license in the Seller Status section.',
      })
      setShowLicenseDialog(true)
      return
    }

    // Check if ID card is uploaded and verified
    if (!hasIdCard || !isIdCardVerified) {
      setDialogMessage({
        title: 'ID Card Verification Required',
        description:
          'To sell firearms on Maltaguns, you must upload and verify your ID card. Please go to your profile and upload your ID card in the Seller Status section.',
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
