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
    // Check if user has uploaded neither ID card nor license
    if (!hasIdCard && !hasLicense) {
      setDialogMessage({
        title: 'ID Card & License Required',
        description:
          'To sell firearms, you must upload both your ID card and firearms license. Please go to your profile and upload both documents in the Seller Status section.',
      })
      setShowLicenseDialog(true)
      return
    }

    // Check if user has uploaded ID card only (no license)
    if (hasIdCard && !hasLicense) {
      setDialogMessage({
        title: 'Firearms License Required',
        description:
          'You have uploaded your ID card, but you still need to upload your firearms license. Please go to your profile and upload a valid license in the Seller Status section.',
      })
      setShowLicenseDialog(true)
      return
    }

    // Check if user has uploaded license only (no ID card)
    if (hasLicense && !hasIdCard) {
      setDialogMessage({
        title: 'ID Card Required',
        description:
          'You have uploaded your firearms license, but you still need to upload your ID card. Please go to your profile and upload your ID card in the Seller Status section.',
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

    // Check if ID card is not verified (uploaded but failed OCR)
    if (hasIdCard && !isIdCardVerified) {
      setDialogMessage({
        title: 'ID Card Verification Failed',
        description:
          'Your ID card could not be verified. This may be because the image quality is poor or the name does not match your profile. Please upload a clear photo of your Malta ID card.',
      })
      setShowLicenseDialog(true)
      return
    }

    // Check if user is a seller
    if (!isSeller) {
      setDialogMessage({
        title: 'Seller Account Required',
        description:
          'To sell firearms on Maltaguns, you need to have a verified seller account. Please go to your profile and upload your ID card and/or license.',
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
