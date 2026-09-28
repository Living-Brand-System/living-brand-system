import { ArrowUpRight, Checkmark, Close, Download } from '@carbon/icons-react'
import type { GuidelineCaption } from '@/components/guideline/structure/caption'
import type {
	GuidelineDisplayActions,
	GuidelineEndAction,
} from '@/components/guideline/structure/card-actions'
import { GuidelineCarouselContainer } from '@/components/guideline/structure/carousel'
import {
	GuidelineSection,
	GuidelineSectionHeading,
} from '@/components/guideline/structure/components'
import {
	type GridColumns,
	type GuidelineCardData,
	GuidelineGridContainer,
} from '@/components/guideline/structure/grid'
import { GuidelineStickyContainer } from '@/components/guideline/structure/sticky'
import type { PaletteCatalog } from '../domain/contract/palette'
import { cmsDisplayAspectRatio, renderCmsDisplay } from './display-render'
import {
	type CmsCard,
	type CmsContainer,
	type CmsSection,
	cardFiles,
	isGuidelineActionHref,
	resolveColor,
	sectionFiles,
	sectionTitle,
	withSectionHierarchy,
} from './model'

const GRID_SIZES = { xs: 240, sm: 320, md: 480, lg: 720, xl: 1440 } as const
const CAROUSEL_HEIGHTS = { sm: 240, md: 320, lg: 480, xl: 720 } as const
const GRID_MIN_SIZES = { xs: 240, sm: 240, md: 320, lg: 320, xl: 320 } as const

function cardEndActions(card: CmsCard): (GuidelineEndAction & { id: string })[] {
	return [
		...cardFiles(card).map((file) => ({
			id: `download-${file.url}`,
			kind: 'link' as const,
			label: `${file.filename} 다운로드`,
			href: file.url,
			download: file.filename,
			icon: <Download size={18} />,
		})),
		...(card.endActions ?? []).flatMap(
			(action, index): (GuidelineEndAction & { id: string })[] => {
				if (!action.label?.trim()) return []
				const shared = { id: `action-${action.id ?? index}`, label: action.label }
				if (action.type === 'link' && isGuidelineActionHref(action.href))
					return [
						{
							...shared,
							kind: 'link',
							href: action.href,
							icon: <ArrowUpRight size={18} />,
						},
					]
				if (action.type === 'copy' && action.value?.trim())
					return [{ ...shared, kind: 'copy', value: action.value }]
				return []
			},
		),
	]
}

function captionData(caption: CmsCard['caption']): GuidelineCaption | undefined {
	if (!caption) return undefined
	const heading = {
		title: caption.title ?? undefined,
		description: caption.description ?? undefined,
	}
	if (caption.type === 'list')
		return {
			...heading,
			type: 'list',
			items: (caption.rows ?? []).map((row) => ({
				title: row.label ?? undefined,
				description: row.value,
			})),
		}
	if (caption.type === 'specification')
		return {
			...heading,
			type: 'specification',
			groups: [
				{
					items: (caption.rows ?? []).map((row) => ({
						label: row.label ?? '',
						value: row.value,
					})),
				},
			],
		}
	return { ...heading, type: 'basic' }
}

/** CMS 관계를 해석한 뒤 공통 카드에 전달한다. 컨테이너는 CMS를 알지 않는다. */
export function CmsGuidelineSections({
	sections,
	paletteCatalog = {},
}: {
	sections: CmsSection[]
	paletteCatalog?: PaletteCatalog
}) {
	return (
		<div data-slot="cms-guideline-sections">
			{withSectionHierarchy(sections).map((section) => {
				const id = section.anchor || section.id
				const hierarchy = section.headingLevel === 3 ? 'sub' : 'main'
				const incorrect = section.type === 'incorrect-usages'
				const assets = sectionFiles(section)
				return (
					<GuidelineSection
						key={section.id ?? id}
						id={id}
						hierarchy={hierarchy}
						className={incorrect ? 'rounded-3xl bg-destructive/15' : undefined}
					>
						<GuidelineSectionHeading
							id={`${id}-heading`}
							hierarchy={hierarchy}
							title={sectionTitle(section)}
							description={section.description ?? undefined}
							align={incorrect ? 'center' : (section.align ?? 'start')}
							download={assets.length ? { filename: `${id}.zip`, assets } : undefined}
						/>
						{(section.containers ?? []).map((container, containerIndex) => (
							<CmsContainerView
								key={container.id ?? containerIndex}
								container={container}
								label={sectionTitle(section)}
								cards={(container.cards ?? []).flatMap(
									(card, cardIndex): GuidelineCardData[] => {
										const status =
											card.status ?? (incorrect ? 'prohibited' : 'none')
										const end = cardEndActions(card)
										const actions: GuidelineDisplayActions = {
											start:
												status === 'none'
													? undefined
													: {
															kind: 'badge',
															label:
																status === 'allowed'
																	? '허용'
																	: '금지',
															variant:
																status === 'allowed'
																	? 'success'
																	: 'destructive',
															icon:
																status === 'allowed' ? (
																	<Checkmark size={18} />
																) : (
																	<Close size={18} />
																),
														},
											end:
												end.length > 1
													? {
															kind: 'group',
															label: '카드 액션',
															actions: end,
														}
													: end[0],
										}
										const display = renderCmsDisplay(
											card.display,
											actions,
											paletteCatalog,
										)
										return display
											? [
													{
														id:
															card.id ??
															`${id}-${containerIndex}-${cardIndex}`,
														ratio: card.ratio,
														backgroundColor: resolveColor(
															card.backgroundColor,
														)?.value,
														foregroundColor: resolveColor(
															card.foregroundColor,
														)?.value,
														displayAspectRatio: cmsDisplayAspectRatio(
															card.display,
															paletteCatalog,
														),
														selectionLabel:
															card.selectionLabel ?? undefined,
														caption: captionData(card.caption),
														display,
													},
												]
											: []
									},
								)}
							/>
						))}
					</GuidelineSection>
				)
			})}
		</div>
	)
}

function CmsContainerView({
	container,
	cards,
	label,
}: {
	container: CmsContainer
	cards: GuidelineCardData[]
	label: string
}) {
	if (container.type === 'sticky')
		return <GuidelineStickyContainer cards={cards} mode={container.stickyMode ?? 'switch'} />
	if (container.type === 'carousel') {
		const props = {
			label,
			displayHeight: CAROUSEL_HEIGHTS[container.height ?? 'md'],
			loop: container.loop ?? true,
			autoplay: container.autoplay ?? false,
		}
		return container.navigation === 'labels' ? (
			<GuidelineCarouselContainer
				{...props}
				navigation="labels"
				cards={cards.map((card) => ({
					...card,
					selectionLabel: card.selectionLabel ?? '',
				}))}
			/>
		) : (
			<GuidelineCarouselContainer {...props} cards={cards} />
		)
	}
	return (
		<GuidelineGridContainer
			columns={Number(container.columns ?? '3') as GridColumns}
			displayWidth={GRID_SIZES[container.size ?? 'md']}
			minDisplayWidth={GRID_MIN_SIZES[container.size ?? 'md']}
			cards={cards}
		/>
	)
}
