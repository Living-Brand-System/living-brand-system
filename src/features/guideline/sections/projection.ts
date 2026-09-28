import { compact } from '../utils/block-text'
import { type CmsCard, type CmsSection, resolveColor, sectionTitle } from './model'

/** 검색·검수용 평문과 근거 스냅샷. Agent 문서 서식과 독립적으로 유지한다. */
export function projectSection(section: CmsSection) {
	const captions = (section.containers ?? []).flatMap((container) =>
		(container.cards ?? []).flatMap(cardText),
	)
	const title = sectionTitle(section)
	return {
		text: compact([title, section.anchor, section.description, ...captions]).join('\n'),
		evidence: {
			type: 'section' as const,
			title,
			anchor: section.anchor ?? undefined,
			description: section.description ?? undefined,
			captions,
		},
		referenceAssets: [],
	}
}

function cardText({ caption, selectionLabel, display, endActions }: CmsCard) {
	return compact([
		selectionLabel,
		...(endActions ?? []).flatMap((action) => [
			action.label,
			action.type === 'copy' ? action.value : action.href,
		]),
		...(display.type === 'image' || display.type === 'guide' ? [display.alt] : []),
		...(display.type === 'swatch'
			? [resolveColor(display.color)?.label, resolveColor(display.color)?.value]
			: []),
		caption?.title,
		caption?.description,
		...(caption?.type !== 'basic'
			? (caption?.rows ?? []).flatMap((row) => [row.label, row.value])
			: []),
	])
}
