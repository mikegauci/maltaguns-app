'use client'

import {
  AppAlert,
  AppCard,
  AppSectionHeading,
} from '@/components/design-system'
import { Badge } from '@/components/ui/badge'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FullscreenImageDialog } from '@/components/dialogs'
import { AlertCircle, X, Info, Maximize2 } from 'lucide-react'
import { Profile } from '../../app/profile/types'
import { LicenseTypes } from '@/lib/license-utils'
import { DocumentUploadButton } from '@/components/DocumentUploadButton'
import { IdentityVerification } from '@/components/profile/IdentityVerification'
import { useState } from 'react'

interface IdentityChange {
  identity_verified: boolean
  identity_status: string | null
  identity_first_name: string | null
  identity_last_name: string | null
  identity_document_type: string | null
  identity_review_notes: string[] | null
}

interface SellerStatusProps {
  profile: Profile
  uploadingLicense: boolean
  licenseUploadProgress: number
  handleLicenseUpload: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => Promise<void>
  handleRemoveLicense: () => Promise<void>
  onIdentityChange: (update: IdentityChange) => void
}

const LICENSE_CHIP_CLASS =
  'border border-border bg-chrome-slate/40 text-xs text-foreground hover:bg-chrome-slate/40'

export const SellerStatus = ({
  profile,
  uploadingLicense,
  licenseUploadProgress,
  handleLicenseUpload,
  handleRemoveLicense,
  onIdentityChange,
}: SellerStatusProps) => {
  const [fullscreenImage, setFullscreenImage] = useState<{
    url: string
    title: string
  } | null>(null)

  const isRegisteredSeller =
    profile.is_seller &&
    profile.is_verified &&
    profile.license_image &&
    profile.identity_verified

  return (
    <>
      <AppCard>
        <CardHeader>
          <CardTitle className="app-display text-lg uppercase tracking-tight">
            Seller Status
          </CardTitle>
          <CardDescription>
            {profile.is_seller
              ? 'Your seller verification status and license information'
              : 'Verify your identity and upload your firearms license to sell firearms'}
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-[-12px] py-2">
          {isRegisteredSeller && (
            <div className="mb-4 flex items-center gap-2">
              <Badge className="bg-emerald-700 text-white hover:bg-emerald-700">
                Registered Seller
              </Badge>
            </div>
          )}

          {!isRegisteredSeller && (
            <AppAlert
              variant="pending"
              icon={<Info className="h-4 w-4" />}
              title="Non-Licensed Seller"
            >
              You can currently add listings and contact sellers for{' '}
              <strong>non-firearms</strong> items only. To list or contact
              sellers of <strong>Firearms</strong>, verify your{' '}
              <a href="#seller-identity" className="font-medium underline">
                identity
              </a>{' '}
              and upload a valid firearms{' '}
              <a href="#seller-license" className="font-medium underline">
                license
              </a>{' '}
              below. Both must be approved before you can sell firearms.
            </AppAlert>
          )}
        </CardContent>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 rounded-sm border border-border p-4 lg:grid-cols-2 lg:items-start">
            <div
              id="seller-identity"
              className="flex scroll-mt-24 flex-col gap-3"
            >
              <AppSectionHeading className="mb-0 text-base">
                Identification
              </AppSectionHeading>
              <IdentityVerification
                identityVerified={profile.identity_verified}
                identityStatus={profile.identity_status}
                identityFirstName={profile.identity_first_name}
                identityLastName={profile.identity_last_name}
                identityDocumentType={profile.identity_document_type}
                identityReviewNotes={profile.identity_review_notes}
                onVerificationChange={onIdentityChange}
              />
            </div>

            <div
              id="seller-license"
              className="flex scroll-mt-24 flex-col gap-3"
            >
              <AppSectionHeading className="mb-0 text-base">
                Firearms License
              </AppSectionHeading>

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    profile.is_verified && profile.license_image
                      ? 'border-emerald-600 text-emerald-400'
                      : profile.license_image
                        ? 'border-amber-600 text-amber-400'
                        : 'border-border text-muted-foreground'
                  }`}
                >
                  {profile.is_verified && profile.license_image
                    ? 'Verified'
                    : profile.license_image
                      ? 'Pending'
                      : 'Not Uploaded'}
                </Badge>
              </div>

              {profile.license_image && (
                <div className="relative w-full">
                  <img
                    id="profile-license-preview"
                    src={profile.license_image}
                    alt="License"
                    className="h-[220px] w-full rounded-sm border border-border object-cover"
                    data-rotation="0"
                  />
                  <button
                    onClick={() =>
                      setFullscreenImage({
                        url: profile.license_image!,
                        title: 'Firearms License',
                      })
                    }
                    className="absolute left-2 top-2 rounded-sm bg-black/70 p-1.5 text-white transition-all hover:bg-black"
                    title="View full screen"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleRemoveLicense}
                    className="absolute right-2 top-2 rounded-sm bg-black/70 p-1.5 text-white transition-all hover:bg-black"
                    title="Remove license"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {profile.license_types && (
                <div className="rounded-sm border border-border bg-muted/20 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Detected License Types
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(() => {
                      const licenses =
                        profile.license_types as unknown as LicenseTypes
                      const detectedLicenses = []

                      if (licenses.tslA) {
                        detectedLicenses.push(
                          <Badge key="tslA" className={LICENSE_CHIP_CLASS}>
                            TSL-A
                          </Badge>
                        )
                      }
                      if (licenses.tslASpecial) {
                        detectedLicenses.push(
                          <Badge
                            key="tslASpecial"
                            className={LICENSE_CHIP_CLASS}
                          >
                            TSL-A (special)
                          </Badge>
                        )
                      }
                      if (licenses.tslB) {
                        detectedLicenses.push(
                          <Badge key="tslB" className={LICENSE_CHIP_CLASS}>
                            TSL-B
                          </Badge>
                        )
                      }
                      if (licenses.hunting) {
                        detectedLicenses.push(
                          <Badge key="hunting" className={LICENSE_CHIP_CLASS}>
                            Hunting
                          </Badge>
                        )
                      }
                      if (licenses.collectorsA) {
                        detectedLicenses.push(
                          <Badge
                            key="collectorsA"
                            className={LICENSE_CHIP_CLASS}
                          >
                            Collectors-A
                          </Badge>
                        )
                      }
                      if (licenses.collectorsASpecial) {
                        detectedLicenses.push(
                          <Badge
                            key="collectorsASpecial"
                            className={LICENSE_CHIP_CLASS}
                          >
                            Collectors-A (special)
                          </Badge>
                        )
                      }

                      return detectedLicenses.length > 0 ? (
                        detectedLicenses
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No license types detected
                        </span>
                      )
                    })()}
                  </div>
                </div>
              )}

              <DocumentUploadButton
                id="license-upload"
                label="Upload license"
                replaceLabel="Replace license"
                isUploading={uploadingLicense}
                uploadProgress={licenseUploadProgress}
                hasExistingDocument={!!profile.license_image}
                onChange={handleLicenseUpload}
              />
              <p className="text-sm leading-relaxed text-muted-foreground">
                {profile.is_seller
                  ? 'Upload your firearms license. License types are detected automatically.'
                  : 'Upload a valid firearms license. Identity verification and an approved license are both required.'}
              </p>
            </div>
          </div>

          {!profile.license_image && (
            <div className="space-y-4 rounded-sm border border-border bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="space-y-2">
                  <h4 className="font-semibold">License Upload Information</h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    MaltaGuns ensures all firearms are owned by licensed
                    individuals. Upload the front page of your Malta police
                    license clearly showing your name and address matching your
                    profile. Images are strictly for verification purposes only
                    and will not be shared. License types are detected
                    automatically from the image.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Questions? Email us at{' '}
                    <a
                      href="mailto:Info@maltaguns.com"
                      className="text-primary hover:underline"
                    >
                      Info@maltaguns.com
                    </a>
                  </p>
                </div>
              </div>
              <div className="flex justify-center">
                <div
                  className="h-64 w-full max-w-md rounded-sm border border-border bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: "url('/license-sample.jpg')" }}
                  aria-label="Sample License"
                />
              </div>
            </div>
          )}
        </CardContent>
      </AppCard>

      <FullscreenImageDialog
        open={fullscreenImage !== null}
        onOpenChange={() => setFullscreenImage(null)}
        imageUrl={fullscreenImage?.url || null}
        title={fullscreenImage?.title || null}
      />
    </>
  )
}
