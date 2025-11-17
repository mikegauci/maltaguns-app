'use client'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Shield,
  AlertCircle,
  Upload,
  RefreshCw,
  X,
  Info,
  CheckCircle2,
} from 'lucide-react'
import { Profile } from '../types'
import { useClickableTooltip } from '@/hooks/useClickableTooltip'

interface SellerStatusProps {
  profile: Profile
  uploadingLicense: boolean
  handleLicenseUpload: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => Promise<void>
  handleRemoveLicense: () => Promise<void>
}

export const SellerStatus = ({
  profile,
  uploadingLicense,
  handleLicenseUpload,
  handleRemoveLicense,
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
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-medium">Seller Status:</span>
            <Badge
              variant={profile.is_seller ? 'default' : 'secondary'}
              className={
                profile.is_seller
                  ? 'bg-green-600 hover:bg-green-600 text-white'
                  : ''
              }
            >
              {profile.is_seller ? 'Registered Seller' : 'Not a Seller'}
            </Badge>
          </div>

          {profile.is_seller && (
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={`h-5 w-5 ${profile.is_verified ? 'text-green-600' : 'text-amber-500'}`}
              />
              <span className="font-medium">Verification:</span>
              <Badge
                variant={profile.is_verified ? 'default' : 'outline'}
                className={
                  profile.is_verified
                    ? 'bg-green-600 hover:bg-green-600 text-white'
                    : 'border-amber-500 text-amber-500'
                }
              >
                {profile.is_verified
                  ? 'License Verified'
                  : 'Pending Verification'}
              </Badge>
              {!profile.is_verified && profile.license_image && (
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
                      Your license has been uploaded but is pending
                      verification. This may take up to 24 hours. You can
                      still create non-firearm listings.
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
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
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              onChange={handleLicenseUpload}
              disabled={uploadingLicense}
              className="hidden"
              id="license-upload"
            />
            <label
              htmlFor="license-upload"
              className="bg-black text-white px-4 py-2 rounded cursor-pointer hover:bg-gray-800 transition-colors flex items-center"
            >
              {profile.license_image ? (
                <RefreshCw className="h-4 w-4 mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {uploadingLicense
                ? 'Uploading...'
                : profile.license_image
                  ? 'Replace License'
                  : 'Upload License'}
            </label>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {profile.is_seller ? (
              'Upload a new license image if your current one has expired.'
            ) : (
              <span
                dangerouslySetInnerHTML={{
                  __html:
                    'You can currently add listings that are <b>not firearms</b> such as assesories. <br/> If you wish to sell <b>Firearms</b> or other license required items, please upload a picture of your license to certify your account.',
                }}
              />
            )}
          </p>
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
            wishing to sell a firearm to upload a picture of their license only
            once and before they list their first firearm. The picture must
            include only the front page of the Malta police license issued to
            you, clearly displaying your name and address which must match those
            on your pofile. Uploaded images will not be shared with anyone and
            are strictly used for verification purposes only. Should you have
            any questions please email us on Info@maltaguns.com.
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
