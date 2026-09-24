import { createLegalPage } from '@/lib/create-legal-page'

const page = createLegalPage('refunds-policy')

export const generateMetadata = page.generateMetadata
export default page.default
