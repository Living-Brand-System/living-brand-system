import { notFound } from 'next/navigation'
import { GuidelineHelperSlot } from '@/components/guideline/deprecated/controllers/helper'
import { playgroundExamples } from '@/components/guideline/deprecated/playground/examples'
import { GuidelinePlayground } from '@/components/guideline/deprecated/playground/playground'
import { readPlaygroundSettings } from '@/components/guideline/deprecated/playground/settings'
import { CardBlock } from '@/features/guideline/blocks/card-block'
import type { CardData } from '@/features/guideline/domain/contract/display'
import { GuidelineHelperProvider } from '@/features/guideline/providers/guideline-helper-provider'

export const dynamic = 'force-dynamic'

type PlaygroundPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }
export default async function PlaygroundPage({ searchParams }: PlaygroundPageProps) {
	if (process.env.NODE_ENV !== 'development') notFound()
	const params = await searchParams
	const examples = await playgroundExamples()
	if (params.preview !== '1')
		return (
			<GuidelinePlayground
				examples={examples.map((example) => ({ value: example.name, label: example.name }))}
			/>
		)
	const example = examples.find((example) => example.name === params.widget) ?? examples[0]
	const settings = readPlaygroundSettings(params)
	return (
		<main data-slot="playground-preview" className="py-8 pb-40">
			<GuidelineHelperProvider>
				<CardBlock
					block={{
						title: example.name,
						layout: settings.layout === 'carousel' ? 'carousel' : 'grid',
						columns: settings.columns as '1' | '2' | '3' | '4',
						cards: Array.from({ length: Number(settings.count) }, (_, index) => ({
							id: `preview-${index}`,
							ratio: settings.ratio as CardData['ratio'],
							display: [example.display],
						})),
					}}
				/>
				<GuidelineHelperSlot />
			</GuidelineHelperProvider>
		</main>
	)
}
