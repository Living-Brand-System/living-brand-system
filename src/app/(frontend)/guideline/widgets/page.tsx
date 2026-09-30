import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-static'

export default function GuidelineWidgetsPage() {
	if (process.env.NODE_ENV !== 'development') notFound()
	redirect('/guideline/playground')
}
