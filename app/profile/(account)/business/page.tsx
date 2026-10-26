'use client'

import { MyEstablishments } from '@/components/profile/MyEstablishments'
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { useProfileContext } from '@/components/profile/ProfileDataProvider'

export default function ProfileBusinessPage() {
  const {
    stores,
    clubs,
    servicing,
    ranges,
    handleDeleteEstablishment,
    establishmentInfoOpen,
    setEstablishmentInfoOpen,
  } = useProfileContext()

  return (
    <ProfilePageLayout
      title="Business"
      description="Manage your stores, clubs, servicing, and ranges"
    >
      <MyEstablishments
        stores={stores}
        clubs={clubs}
        servicing={servicing}
        ranges={ranges}
        handleDeleteEstablishment={handleDeleteEstablishment}
        establishmentInfoOpen={establishmentInfoOpen}
        setEstablishmentInfoOpen={setEstablishmentInfoOpen}
      />
    </ProfilePageLayout>
  )
}
