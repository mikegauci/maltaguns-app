'use client'

import { ProfileInformation } from '@/components/profile/ProfileInformation'
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { SellerStatus } from '@/components/profile/SellerStatus'
import { useProfileContext } from '@/components/profile/ProfileDataProvider'

export default function ProfileOverviewPage() {
  const {
    profile,
    form,
    isEditing,
    setIsEditing,
    uploadingLicense,
    licenseUploadProgress,
    onSubmit,
    handleLicenseUpload,
    handleRemoveLicense,
    onIdentityChange,
  } = useProfileContext()

  if (!profile) return null

  return (
    <ProfilePageLayout
      title="Profile"
      description="Manage your personal information and seller status"
    >
      <div className="space-y-6">
        <ProfileInformation
          profile={profile}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          form={form}
          onSubmit={onSubmit}
        />
        <SellerStatus
          profile={profile}
          uploadingLicense={uploadingLicense}
          licenseUploadProgress={licenseUploadProgress}
          handleLicenseUpload={handleLicenseUpload}
          handleRemoveLicense={handleRemoveLicense}
          onIdentityChange={onIdentityChange}
        />
      </div>
    </ProfilePageLayout>
  )
}
