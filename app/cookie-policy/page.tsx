import { createLegalPage } from '@/lib/create-legal-page'

const page = createLegalPage('cookie-policy')

export const generateMetadata = page.generateMetadata
export default page.default
