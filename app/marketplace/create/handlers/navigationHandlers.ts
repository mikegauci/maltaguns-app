import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

interface NavigationHandlerDependencies {
  router: AppRouterInstance
  isSeller: boolean
  setShowLicenseDialog: (show: boolean) => void
}

export function createNavigationHandlers(deps: NavigationHandlerDependencies) {
  const { router, isSeller, setShowLicenseDialog } = deps

  function handleFirearmsClick() {
    if (!isSeller) {
      setShowLicenseDialog(true)
    } else {
      router.push('/marketplace/create/firearms')
    }
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
