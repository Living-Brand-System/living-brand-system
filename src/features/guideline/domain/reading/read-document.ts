import type { GuidelineDocument, Rule } from '@/payload-types'
import { formatBlockForAgent } from '../../blocks/projection'
import { collectGuidelineCheckSources } from '../../checks/collect-guideline-check-sources'
import {
	type CmsCard,
	type CmsContainer,
	cardFiles,
	isGuidelineActionHref,
	resolveColor,
	resolveFile,
	sectionFiles,
	withSectionHierarchy,
} from '../../sections/model'
import type { PaletteCatalog } from '../contract/palette'
import { type GuidelineReadAction, toReadVisual, visualInteractions } from './read-visual'

export type GuidelineSourceDocument = Pick<
	GuidelineDocument,
	'id' | 'title' | 'slug' | 'contentModel' | 'sections' | 'blocks' | 'rules' | 'headerImage'
> &
	Partial<Pick<GuidelineDocument, 'chapter' | 'displayOrder'>>

/** 권한을 통과한 원본 → 공통 읽기 계약. 저장·조회·출력 길이 정책을 수행하지 않는다. */
export function toGuidelineReadDocument(
	sourceDocument: GuidelineSourceDocument,
	catalog: PaletteCatalog = {},
) {
	const chapter = sourceDocument.chapter
	const shared = {
		id: sourceDocument.id,
		title: sourceDocument.title,
		slug: sourceDocument.slug,
		chapter:
			typeof chapter === 'number'
				? { id: chapter, title: null, slug: null }
				: chapter
					? { id: chapter.id, title: chapter.title, slug: chapter.slug }
					: null,
		displayOrder: sourceDocument.displayOrder ?? null,
		headerImage: sourceDocument.headerImage
			? resolveFile({ relationTo: 'application-images', value: sourceDocument.headerImage })
			: null,
		rules: readRules(sourceDocument.rules),
		checks: collectGuidelineCheckSources(sourceDocument).map(({ rule }) => ({
			key: rule.key,
			title: rule.title,
		})),
	}
	if (sourceDocument.contentModel !== 'sections')
		return {
			...shared,
			contentModel: 'legacy' as const,
			// 레거시 blocks의 공개 구조는 유지한다. 기존 평문 해석도 이 경계에서 끝낸다.
			blocks: (sourceDocument.blocks ?? []).map((block) => ({
				...block,
				text: formatBlockForAgent(block),
			})),
		}
	return {
		...shared,
		contentModel: 'sections' as const,
		sections: withSectionHierarchy(sourceDocument.sections ?? []).map((section) => ({
			id: section.id,
			type: section.type,
			headingLevel: section.headingLevel,
			parentSectionId: section.parentSectionId,
			title: section.title ?? '',
			description: section.description ?? null,
			anchor: section.anchor ?? null,
			align:
				section.type === 'incorrect-usages'
					? ('center' as const)
					: (section.align ?? 'start'),
			rules: readRules(section.rules),
			actions: sectionDownloadActions(sectionFiles(section)),
			contentGroups: (section.containers ?? []).map((container, index) => ({
				id: container.id ?? `${section.id}-group-${index}`,
				layout: readLayout(container),
				figures: (container.cards ?? []).map((card, cardIndex) => {
					const visual = toReadVisual(card.display, catalog)
					const interactions = visualInteractions(visual)
					return {
						id: card.id ?? `${section.id}-group-${index}-figure-${cardIndex}`,
						ratio: card.ratio ?? '4:3',
						selectionLabel: card.selectionLabel ?? null,
						backgroundColor: resolveColor(card.backgroundColor),
						foregroundColor: resolveColor(card.foregroundColor),
						visual,
						caption: readCaption(card.caption),
						usageStatus:
							card.status ??
							(section.type === 'incorrect-usages'
								? ('prohibited' as const)
								: ('none' as const)),
						controls: interactions.controls,
						actions: [...interactions.actions, ...registeredActions(card)],
					}
				}),
			})),
		})),
	}
}

export type GuidelineReadDocument = ReturnType<typeof toGuidelineReadDocument>
export type GuidelineReadSection = Extract<
	GuidelineReadDocument,
	{ contentModel: 'sections' }
>['sections'][number]
export type GuidelineReadFigure = GuidelineReadSection['contentGroups'][number]['figures'][number]

function readRules(rules: (number | Rule)[] | null | undefined) {
	return (rules ?? []).map((rule) =>
		typeof rule === 'number'
			? { id: rule }
			: { id: rule.id, key: rule.key, title: rule.title, tier: rule.tier },
	)
}

function readLayout(container: CmsContainer) {
	if (container.type === 'carousel')
		return {
			type: container.type,
			height: container.height ?? 'md',
			navigation: container.navigation ?? 'counter',
			loop: container.loop ?? true,
			autoplay: container.autoplay ?? false,
			intervalMs: 3000,
		}
	if (container.type === 'sticky')
		return { type: container.type, mode: container.stickyMode ?? 'switch' }
	return {
		type: container.type,
		columns: Number(container.columns ?? '3'),
		size: container.size ?? 'md',
	}
}

function readCaption(caption: CmsCard['caption']) {
	if (!caption) return null
	const heading = {
		title: caption.title ?? null,
		description: caption.description ?? null,
	}
	return caption.type === 'basic'
		? { ...heading, type: 'basic' as const }
		: {
				...heading,
				type: caption.type,
				rows: (caption.rows ?? []).map((row) => ({
					label: row.label ?? null,
					value: row.value,
				})),
			}
}

function sectionDownloadActions(files: ReturnType<typeof sectionFiles>): GuidelineReadAction[] {
	return files.length ? [{ kind: 'download', label: '전체 다운로드', files }] : []
}

function registeredActions(card: CmsCard): GuidelineReadAction[] {
	return [
		...cardFiles(card).map(
			(file): GuidelineReadAction => ({
				kind: 'download',
				label: `${file.filename} 다운로드`,
				files: [file],
			}),
		),
		...(card.endActions ?? []).flatMap((action): GuidelineReadAction[] => {
			if (!action.label?.trim()) return []
			if (action.type === 'link' && isGuidelineActionHref(action.href))
				return [{ kind: 'link', label: action.label, href: action.href }]
			if (action.type === 'copy' && action.value?.trim())
				return [{ kind: 'copy', label: action.label, value: action.value }]
			return []
		}),
	]
}
