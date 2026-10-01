import Link from 'next/link'
import { PanelCard, PanelChip } from '@/components/shared/panel-card'
import type { GetGuidelineNavigationOutput } from '@/features/guideline/services/get-guideline-navigation.service'
import { cn } from '@/lib/utils'

const CARD_LAYOUT = [
	{ card: 'md:col-span-1 min-h-75', list: 'flex flex-col items-start gap-1.5' },
	{
		card: 'md:col-span-2 min-h-150',
		list: 'grid grid-cols-1 justify-items-start gap-1.5 md:grid-cols-3',
	},
	{ card: 'md:col-span-3 min-h-150', list: 'flex flex-col items-start gap-1.5' },
] as const

export function GuidelineChapters({
	chapters,
}: {
	chapters: GetGuidelineNavigationOutput['chapters']
}) {
	return (
		<section className="grid grid-cols-1 items-start gap-3 md:grid-cols-3">
			{chapters.map((chapter, index) => {
				const layout = CARD_LAYOUT[index % CARD_LAYOUT.length] ?? CARD_LAYOUT[0]
				return (
					<PanelCard className={layout.card} key={chapter.id} title={chapter.title}>
						<ul className={cn('m-0 list-none p-0', layout.list)}>
							{chapter.topics.map((topic) => (
								<li key={topic.href}>
									<PanelChip
										asChild
										className="no-underline transition-colors hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
									>
										<Link href={topic.href}>{topic.title}</Link>
									</PanelChip>
								</li>
							))}
						</ul>
					</PanelCard>
				)
			})}
		</section>
	)
}
