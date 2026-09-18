'use client'

import { Badge } from '@/components/ui/badge'
import {
  Card,
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Seller Status</CardTitle>
          <CardDescription>
            {profile.is_seller
              ? 'Your seller verification status and license information'
              : 'Verify your identity and upload your firearms license to sell firearms'}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-2 mt-[-12px]">
          {profile.is_seller &&
            profile.is_verified &&
            profile.license_image &&
            profile.identity_verified && (
              <div className="flex items-center gap-2 mb-4">
                <Badge
                  variant="default"
                  className="bg-green-600 hover:bg-green-600 text-white"
                >
                  Registered Seller
                </Badge>
              </div>
            )}

          {/* Non-Licensed Seller Information */}
          {!(
            profile.is_seller &&
            profile.is_verified &&
            profile.license_image &&
            profile.identity_verified
          ) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-blue-900">
                    Non-Licensed Seller
                  </h4>
                  <p className="text-sm text-blue-800">
                    You can currently add listings and contact sellers for{' '}
                    <strong>non-firearms</strong> items only. To list or contact
                    sellers of <strong>Firearms</strong>, verify your{' '}
                    <a
                      href="#seller-identity"
                      className="underline font-medium hover:text-blue-950"
                    >
                      identity
                    </a>{' '}
                    and upload a valid firearms{' '}
                    <a
                      href="#seller-license"
                      className="underline font-medium hover:text-blue-950"
                    >
                      license
                    </a>{' '}
                    below. Both must be approved before you can sell firearms.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardContent className="space-y-6">
          {/* Document Upload Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-start gap-6 border rounded-lg p-4">
            <div
              id="seller-identity"
              className="flex flex-col gap-3 scroll-mt-24"
            >
              <h3 className="text-base font-semibold">Identification</h3>
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
              className="flex flex-col gap-3 scroll-mt-24"
            >
              <h3 className="text-base font-semibold">Firearms License</h3>

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    profile.is_verified && profile.license_image
                      ? 'border-green-600 text-green-600'
                      : profile.license_image
                        ? 'border-amber-500 text-amber-500'
                        : 'border-gray-400 text-gray-400'
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
                    className="w-full h-[220px] object-cover rounded-md border"
                    data-rotation="0"
                  />
                  <button
                    onClick={() =>
                      setFullscreenImage({
                        url: profile.license_image!,
                        title: 'Firearms License',
                      })
                    }
                    className="absolute top-2 left-2 bg-black bg-opacity-70 text-white p-1.5 rounded-full hover:bg-opacity-100 transition-all"
                    title="View full screen"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleRemoveLicense}
                    className="absolute top-2 right-2 bg-black bg-opacity-70 text-white p-1.5 rounded-full hover:bg-opacity-100 transition-all"
                    title="Remove license"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {profile.license_types && (
                <div className="p-3 border rounded-md bg-muted/20">
                  <p className="text-xs font-semibold mb-2 text-muted-foreground">
                    Detected License Types:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(() => {
                      const licenses =
                        profile.license_types as unknown as LicenseTypes
                      const detectedLicenses = []

                      if (licenses.tslA) {
                        detectedLicenses.push(
                          <Badge
                            key="tslA"
                            className="bg-blue-600 hover:bg-blue-700 text-xs"
                          >
                            TSL-A
                          </Badge>
                        )
                      }
                      if (licenses.tslASpecial) {
                        detectedLicenses.push(
                          <Badge
                            key="tslASpecial"
                            className="bg-purple-600 hover:bg-purple-700 text-xs"
                          >
                            TSL-A (special)
                          </Badge>
                        )
                      }
                      if (licenses.tslB) {
                        detectedLicenses.push(
                          <Badge
                            key="tslB"
                            className="bg-green-600 hover:bg-green-700 text-xs"
                          >
                            TSL-B
                          </Badge>
                        )
                      }
                      if (licenses.hunting) {
                        detectedLicenses.push(
                          <Badge
                            key="hunting"
                            className="bg-amber-600 hover:bg-amber-700 text-xs"
                          >
                            Hunting
                          </Badge>
                        )
                      }
                      if (licenses.collectorsA) {
                        detectedLicenses.push(
                          <Badge
                            key="collectorsA"
                            className="bg-indigo-600 hover:bg-indigo-700 text-xs"
                          >
                            Collectors-A
                          </Badge>
                        )
                      }
                      if (licenses.collectorsASpecial) {
                        detectedLicenses.push(
                          <Badge
                            key="collectorsASpecial"
                            className="bg-rose-600 hover:bg-rose-700 text-xs"
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
              <p className="text-sm text-muted-foreground leading-relaxed">
                {profile.is_seller
                  ? 'Upload your firearms license. License types are detected automatically.'
                  : 'Upload a valid firearms license. Identity verification and an approved license are both required.'}
              </p>
            </div>
          </div>

          {/* License Information & Sample */}
          {!profile.license_image && (
            <div className="bg-muted/30 border rounded-lg p-4 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-semibold">License Upload Information</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
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
                  className="w-full max-w-md h-64 rounded-lg bg-cover bg-center bg-no-repeat border"
                  style={{ backgroundImage: "url('/license-sample.jpg')" }}
                  aria-label="Sample License"
                ></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fullscreen Image Dialog */}
      <FullscreenImageDialog
        open={fullscreenImage !== null}
        onOpenChange={() => setFullscreenImage(null)}
        imageUrl={fullscreenImage?.url || null}
        title={fullscreenImage?.title || null}
      />
    </>
  )
}
