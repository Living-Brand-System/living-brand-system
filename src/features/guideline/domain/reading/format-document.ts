import type {
	GuidelineReadDocument,
	GuidelineReadFigure,
	GuidelineReadSection,
} from './read-document'
import type { GuidelineReadAction } from './read-visual'

/** 읽기 모델에 확정된 값만 표현한다. 기본값·관계 해석과 응답 길이 제한은 하지 않는다. */
export function formatGuidelineReadDocument(document: GuidelineReadDocument) {
	const { contentModel, checks, ...metadata } = document
	return textParts([
		document.chapter?.title ? `Chapter: ${document.chapter.title}` : null,
		`# ${document.title}`,
		`Document: ${JSON.stringify({ id: metadata.id, slug: metadata.slug, chapter: metadata.chapter, displayOrder: metadata.displayOrder, headerImage: metadata.headerImage, rules: metadata.rules, contentModel })}`,
		...(document.contentModel === 'sections'
			? document.sections.map(formatSectionForAgent)
			: document.blocks.map(
					({ text, ...block }) => `${text}\nLegacy block: ${JSON.stringify(block)}`,
				)),
		checks.length
			? `Checks:\n${checks.map((check) => `- ${check.key}: ${check.title}`).join('\n')}`
			: null,
	]).join('\n\n')
}

export function formatSectionForAgent(section: GuidelineReadSection) {
	return textParts([
		`${'#'.repeat(section.headingLevel)} ${section.title}`,
		`Section: ${JSON.stringify({ id: section.id, type: section.type, headingLevel: section.headingLevel, parentSectionId: section.parentSectionId, anchor: section.anchor, align: section.align, rules: section.rules })}`,
		labeledText('Description', section.description),
		formatActionsForAgent(section.actions),
		...section.contentGroups.map((group, index) =>
			[
				`Content group ${index + 1} — Layout: ${group.layout.type}`,
				`Group: ${JSON.stringify({ id: group.id, layout: group.layout })}`,
				...group.figures.map(formatFigureForAgent),
			].join('\n\n'),
		),
	]).join('\n\n')
}

function formatFigureForAgent(figure: GuidelineReadFigure, index: number) {
	return textParts([
		`Figure ${index + 1} (도판)`,
		labeledText('ID', figure.id),
		labeledText('Selection label', figure.selectionLabel),
		`Presentation: ${JSON.stringify({ ratio: figure.ratio, backgroundColor: figure.backgroundColor, foregroundColor: figure.foregroundColor })}`,
		`Visual type: ${figure.visual.type}`,
		`Visual: ${JSON.stringify(figure.visual)}`,
		formatCaptionForAgent(figure.caption),
		`Usage status (author-assigned): ${figure.usageStatus}`,
		figure.controls.length
			? `Controls (조작):\n${figure.controls.map((control) => JSON.stringify(control)).join('\n')}`
			: null,
		formatActionsForAgent(figure.actions),
	]).join('\n')
}

function formatCaptionForAgent(caption: GuidelineReadFigure['caption']) {
	if (!caption) return null
	const heading = textParts([
		labeledText('Title', caption.title),
		labeledText('Description', caption.description),
	])
	const details = ('rows' in caption ? caption.rows : []).map((row, index) => {
		if (caption.type === 'specification')
			return `- ${row.label ?? ''}: ${row.value.replace(/\n/g, '\n  ')}`
		return `${index + 1}. ${textParts([
			labeledText('Title', row.label),
			labeledText('Description', row.value),
		]).join('\n   ')}`
	})
	if (!heading.length && !details.length) return null
	return textParts([
		'Caption (캡션):',
		...heading,
		details.length
			? `${caption.type === 'specification' ? 'Specification (명세)' : 'List (목록)'}:\n${details.join('\n')}`
			: null,
	]).join('\n')
}

function formatActionsForAgent(actions: GuidelineReadAction[]) {
	return actions.length
		? `Actions (동작):\n${actions
				.map((action) => {
					switch (action.kind) {
						case 'download':
							return `- Download: ${action.label}\n  Files: ${JSON.stringify(action.files)}`
						case 'link':
							return `- ${labeledText('Link', action.label)}\n  ${labeledText('URL', action.href)}`
						case 'copy':
							return `- ${labeledText('Copy', action.label)}\n  ${labeledText('Value', action.value)}`
						case 'reset':
							return `- Reset: ${action.label}\n  Target: ${action.target}\n  Value: ${action.value}`
					}
					throw new Error('Unsupported read action')
				})
				.join('\n')}`
		: null
}

function labeledText(label: string, value: string | null | undefined) {
	return value === null || value === undefined || value === ''
		? null
		: `${label}: ${value.replace(/\n/g, '\n  ')}`
}

/** 원문 값의 공백·줄바꿈은 보존하고 없는 조각만 제외한다. */
function textParts(values: (string | null | undefined)[]) {
	return values.filter(
		(value): value is string => value !== null && value !== undefined && value !== '',
	)
}
