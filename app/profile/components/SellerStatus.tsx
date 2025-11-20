'use client'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AlertCircle, X, Info, CheckCircle2, ShieldCheck } from 'lucide-react'
import { Profile } from '../types'
import { useClickableTooltip } from '@/hooks/useClickableTooltip'
import { LicenseTypes } from '@/lib/license-utils'
import { DocumentUploadButton } from '@/components/DocumentUploadButton'

interface SellerStatusProps {
  profile: Profile
  uploadingLicense: boolean
  uploadingIdCard: boolean
  licenseUploadProgress: number
  idCardUploadProgress: number
  handleLicenseUpload: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => Promise<void>
  handleIdCardUpload: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => Promise<void>
  handleRemoveLicense: () => Promise<void>
  handleRemoveIdCard: () => Promise<void>
}

export const SellerStatus = ({
  profile,
  uploadingLicense,
  uploadingIdCard,
  licenseUploadProgress,
  idCardUploadProgress,
  handleLicenseUpload,
  handleIdCardUpload,
  handleRemoveLicense,
  handleRemoveIdCard,
}: SellerStatusProps) => {
  const { isOpen, triggerProps, contentProps } = useClickableTooltip()

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle>Seller Status</CardTitle>
          <CardDescription>
            {profile.is_seller
              ? 'Your seller verification status and license information'
              : 'Upload a picture of your license to certify your account'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="font-medium">Seller Status:</span>
              <Badge
                variant={
                  profile.is_seller &&
                  profile.is_verified &&
                  profile.license_image &&
                  profile.id_card_verified &&
                  profile.id_card_image
                    ? 'default'
                    : 'secondary'
                }
                className={
                  profile.is_seller &&
                  profile.is_verified &&
                  profile.license_image &&
                  profile.id_card_verified &&
                  profile.id_card_image
                    ? 'bg-green-600 hover:bg-green-600 text-white'
                    : ''
                }
              >
                {profile.is_seller &&
                profile.is_verified &&
                profile.license_image &&
                profile.id_card_verified &&
                profile.id_card_image
                  ? 'Registered Seller'
                  : 'Not a Seller'}
              </Badge>
            </div>

            {/* ID Card Verification Status */}
            <div className="flex items-center gap-2">
              {profile.id_card_verified && profile.id_card_image ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : profile.id_card_image ? (
                <Info className="h-5 w-5 text-amber-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-gray-400" />
              )}
              <span className="font-medium">ID Card:</span>
              <Badge
                variant={
                  profile.id_card_verified && profile.id_card_image
                    ? 'default'
                    : 'outline'
                }
                className={
                  profile.id_card_verified && profile.id_card_image
                    ? 'bg-green-600 hover:bg-green-600 text-white'
                    : profile.id_card_image
                      ? 'border-amber-500 text-amber-500'
                      : 'border-gray-400 text-gray-400'
                }
              >
                {profile.id_card_verified && profile.id_card_image
                  ? 'Verified'
                  : profile.id_card_image
                    ? 'Pending'
                    : 'Not Uploaded'}
              </Badge>
              {!(profile.id_card_verified && profile.id_card_image) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center p-1 -m-1 rounded hover:bg-accent transition-colors touch-manipulation"
                      aria-label="ID card verification information"
                    >
                      <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    sideOffset={8}
                    className="max-w-[250px] sm:max-w-[300px]"
                  >
                    <p className="text-xs sm:text-sm">
                      {profile.id_card_image
                        ? 'Your ID card has been uploaded but verification is pending. A verified ID card is required along with your license to view seller contact information in marketplace listings.'
                        : 'Upload your Malta ID card for verification. This is required along with your license to view seller contact information in marketplace listings.'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* License Verification Status */}
            <div className="flex items-center gap-2">
              {profile.is_verified && profile.license_image ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : profile.license_image ? (
                <Info className="h-5 w-5 text-amber-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-gray-400" />
              )}
              <span className="font-medium">License:</span>
              <Badge
                variant={
                  profile.is_verified && profile.license_image
                    ? 'default'
                    : 'outline'
                }
                className={
                  profile.is_verified && profile.license_image
                    ? 'bg-green-600 hover:bg-green-600 text-white'
                    : profile.license_image
                      ? 'border-amber-500 text-amber-500'
                      : 'border-gray-400 text-gray-400'
                }
              >
                {profile.is_verified && profile.license_image
                  ? 'Verified'
                  : profile.license_image
                    ? 'Pending'
                    : 'Not Uploaded'}
              </Badge>
              {!(profile.is_verified && profile.license_image) && (
                <Tooltip open={isOpen}>
                  <TooltipTrigger asChild {...triggerProps}>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center p-1 -m-1 rounded hover:bg-accent transition-colors touch-manipulation"
                      aria-label="Verification information"
                    >
                      <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    sideOffset={8}
                    className="max-w-[250px] sm:max-w-[300px]"
                    {...contentProps}
                  >
                    <p className="text-xs sm:text-sm">
                      {profile.license_image
                        ? 'Your license has been uploaded but is pending verification. This may take up to 24 hours. You can still create non-firearm listings.'
                        : 'Upload your firearms license for verification. This is required to list firearms for sale.'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* ID Card Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">ID Card</h3>
              {profile.id_card_image && (
                <div className="relative">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Current ID Card:
                  </p>
                  <div className="relative inline-block">
                    <img
                      id="profile-id-card-preview"
                      src={profile.id_card_image}
                      alt="ID Card"
                      className="w-64 h-auto rounded-md mb-4"
                    />
                    <button
                      onClick={handleRemoveIdCard}
                      className="absolute top-2 right-2 bg-black bg-opacity-70 text-white p-1 rounded-full hover:bg-opacity-100 transition-all"
                      title="Remove ID card"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <DocumentUploadButton
                id="id-card-upload"
                label="Upload ID Card"
                replaceLabel="Replace ID Card"
                isUploading={uploadingIdCard}
                uploadProgress={idCardUploadProgress}
                hasExistingDocument={!!profile.id_card_image}
                onChange={handleIdCardUpload}
              />
              <p className="text-sm text-muted-foreground mt-2">
                Upload an image of your Malta ID card for verification. ID cards
                types will be automatically detected from your first and last
                name on your profile.
              </p>
            </div>

            {/* License Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Firearms License</h3>
              {profile.license_image && (
                <div className="relative">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Current License:
                  </p>
                  <div className="relative inline-block">
                    <img
                      id="profile-license-preview"
                      src={profile.license_image}
                      alt="License"
                      className="w-64 h-auto rounded-md mb-4"
                      data-rotation="0"
                    />
                    <button
                      onClick={handleRemoveLicense}
                      className="absolute top-2 right-2 bg-black bg-opacity-70 text-white p-1 rounded-full hover:bg-opacity-100 transition-all"
                      title="Remove license"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Display detected license types */}
                  {profile.license_types && (
                    <div className="mt-4 p-3 border rounded-md bg-muted/20">
                      <p className="text-sm font-semibold mb-2">
                        Detected License Types:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const licenses =
                            profile.license_types as unknown as LicenseTypes
                          const detectedLicenses = []

                          if (licenses.tslA) {
                            detectedLicenses.push(
                              <Badge
                                key="tslA"
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                TSL-A
                              </Badge>
                            )
                          }
                          if (licenses.tslASpecial) {
                            detectedLicenses.push(
                              <Badge
                                key="tslASpecial"
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                TSL-A (special)
                              </Badge>
                            )
                          }
                          if (licenses.tslB) {
                            detectedLicenses.push(
                              <Badge
                                key="tslB"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                TSL-B
                              </Badge>
                            )
                          }
                          if (licenses.hunting) {
                            detectedLicenses.push(
                              <Badge
                                key="hunting"
                                className="bg-amber-600 hover:bg-amber-700"
                              >
                                Hunting
                              </Badge>
                            )
                          }
                          if (licenses.collectorsA) {
                            detectedLicenses.push(
                              <Badge
                                key="collectorsA"
                                className="bg-indigo-600 hover:bg-indigo-700"
                              >
                                Collectors-A
                              </Badge>
                            )
                          }
                          if (licenses.collectorsASpecial) {
                            detectedLicenses.push(
                              <Badge
                                key="collectorsASpecial"
                                className="bg-rose-600 hover:bg-rose-700"
                              >
                                Collectors-A (special)
                              </Badge>
                            )
                          }

                          return detectedLicenses.length > 0 ? (
                            detectedLicenses
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              No license types detected
                            </span>
                          )
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <DocumentUploadButton
                id="license-upload"
                label="Upload License"
                replaceLabel="Replace License"
                isUploading={uploadingLicense}
                uploadProgress={licenseUploadProgress}
                hasExistingDocument={!!profile.license_image}
                onChange={handleLicenseUpload}
              />
              <p className="text-sm text-muted-foreground mt-2">
                {profile.is_seller ? (
                  'Upload a new license image to update your license types. License types are automatically detected from your document.'
                ) : (
                  <span
                    dangerouslySetInnerHTML={{
                      __html:
                        'You can currently add listings that are <b>not firearms</b> such as assesories. <br/> If you wish to sell <b>Firearms</b> or other license required items, please upload a picture of your license to certify your account. License types will be automatically detected.',
                    }}
                  />
                )}
              </p>
            </div>
          </div>
        </CardContent>
        {!profile.license_image && (
          <div className="m-6 p-4 border rounded-md bg-muted/50">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-primary" />
              <span className="font-medium">Information:</span>
            </div>
            <p className="mb-3">
              Maltaguns ensures that all firearms added to the site are owned by
              licensed individuals. For this reason, we require all sellers
              wishing to sell a firearm to upload a picture of their license
              only once and before they list their first firearm. The picture
              must include only the front page of the Malta police license
              issued to you, clearly displaying your name and address which must
              match those on your pofile. Uploaded images will not be shared
              with anyone and are strictly used for verification purposes only.
              Should you have any questions please email us on
              Info@maltaguns.com. Your license types will be automatically
              detected from the image.
            </p>
            <div
              className="w-full max-w-md h-72 rounded-md bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: "url('/license-sample.jpg')" }}
              aria-label="Sample License"
            ></div>
          </div>
        )}
      </Card>
    </TooltipProvider>
  )
}
