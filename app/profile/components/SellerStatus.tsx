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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircle, X, Info, Maximize2 } from 'lucide-react'
import { Profile } from '../types'
import { LicenseTypes } from '@/lib/license-utils'
import { DocumentUploadButton } from '@/components/DocumentUploadButton'
import { useState } from 'react'

interface SellerStatusProps {
  profile: Profile
  uploadingLicense: boolean
  uploadingIdCard: boolean
  licenseUploadProgress: number
  idCardUploadProgress: number
  handleLicenseUpload: (
    event: React.ChangeEvent<HTMLInputElement> // eslint-disable-line unused-imports/no-unused-vars
  ) => Promise<void>
  handleIdCardUpload: (
    event: React.ChangeEvent<HTMLInputElement> // eslint-disable-line unused-imports/no-unused-vars
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
              : 'Upload a picture of your license to certify your account'}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-2 mt-[-12px]">
          {profile.is_seller &&
            profile.is_verified &&
            profile.license_image &&
            profile.id_card_verified &&
            profile.id_card_image && (
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
            profile.id_card_verified &&
            profile.id_card_image
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
                    sellers of <strong>Firearms</strong>, upload a valid
                    firearms license above.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardContent className="space-y-6">
          {/* Document Upload Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ID Card Section */}
            <div className="space-y-3 border rounded-lg p-4">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <span>ID Card</span>
              </h3>
              {/* ID Card Status */}
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    profile.id_card_verified && profile.id_card_image
                      ? 'border-green-600 text-green-600'
                      : profile.id_card_image
                        ? 'border-amber-500 text-amber-500'
                        : 'border-gray-400 text-gray-400'
                  }`}
                >
                  {profile.id_card_verified && profile.id_card_image
                    ? 'Verified'
                    : profile.id_card_image
                      ? 'Pending'
                      : 'Not Uploaded'}
                </Badge>
              </div>

              {profile.id_card_image && (
                <div className="space-y-2">
                  <div className="relative w-full max-w-sm">
                    <img
                      id="profile-id-card-preview"
                      src={profile.id_card_image}
                      alt="ID Card"
                      className="w-[100%] h-[220px] object-cover rounded-md border"
                    />
                    <button
                      onClick={() =>
                        setFullscreenImage({
                          url: profile.id_card_image!,
                          title: 'ID Card',
                        })
                      }
                      className="absolute top-2 left-2 bg-black bg-opacity-70 text-white p-1.5 rounded-full hover:bg-opacity-100 transition-all"
                      title="View full screen"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleRemoveIdCard}
                      className="absolute top-2 right-2 bg-black bg-opacity-70 text-white p-1.5 rounded-full hover:bg-opacity-100 transition-all"
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
              <p className="text-xs text-muted-foreground">
                Upload your Maltese ID card. Verification is automatic based on
                your profile name.
              </p>
            </div>

            {/* License Section */}
            <div className="space-y-3 border rounded-lg p-4">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <span>Firearms License</span>
              </h3>

              {/* License Status */}
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
                <div className="space-y-3">
                  <div className="relative w-full max-w-sm">
                    <img
                      id="profile-license-preview"
                      src={profile.license_image}
                      alt="License"
                      className="w-[100%] h-[220px] object-cover rounded-md border"
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
              {/* Display detected license types */}
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
              <p className="text-xs text-muted-foreground">
                {profile.is_seller
                  ? 'Upload your firearms license. License types are detected automatically.'
                  : 'Upload a valid firearms license to list and contact sellers for firearms.'}
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
      <Dialog
        open={fullscreenImage !== null}
        onOpenChange={() => setFullscreenImage(null)}
      >
        <DialogContent className="max-w-4xl w-full">
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
          <DialogHeader>
            <DialogTitle>{fullscreenImage?.title}</DialogTitle>
          </DialogHeader>
          <div className="relative w-full">
            <img
              src={fullscreenImage?.url}
              alt={fullscreenImage?.title}
              className="w-full h-auto max-h-[80vh] object-contain rounded-md"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
