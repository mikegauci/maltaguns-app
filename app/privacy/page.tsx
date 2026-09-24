import { createLegalPage } from '@/lib/create-legal-page'

const page = createLegalPage('privacy')

export const generateMetadata = page.generateMetadata
export default page.default
