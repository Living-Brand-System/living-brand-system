import { StudioLayoutPlayground } from '@/components/studio/playground/layout-playground'

export const metadata = { title: 'Studio Layout Playground' }

export default async function StudioPlaygroundPage({
	searchParams,
}: {
	searchParams: Promise<{ view?: string; experiment?: string }>
}) {
	const params = await searchParams
	return (
		<StudioLayoutPlayground
			initialExample={
				params.view === 'template' || params.experiment === 'panels'
					? 'template'
					: params.view === 'image'
						? 'image'
						: 'graphic'
			}
		/>
	)
}
