import { createLegalPage } from '@/lib/create-legal-page'

const page = createLegalPage('terms')

export const generateMetadata = page.generateMetadata
export default page.default
