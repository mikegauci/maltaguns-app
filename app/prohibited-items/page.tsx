import { createLegalPage } from '@/lib/create-legal-page'

const page = createLegalPage('prohibited-items')

export const generateMetadata = page.generateMetadata
export default page.default
