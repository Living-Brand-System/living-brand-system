import { isValidHex } from '@/lib/color'
import type { BrandColor, GuidelineDocument } from '@/payload-types'
import type { SectionHierarchy } from '../domain/contract/guideline'

export type CmsSection = NonNullable<GuidelineDocument['sections']>[number]
export type CmsContainer = NonNullable<CmsSection['containers']>[number]
export type CmsCard = NonNullable<CmsContainer['cards']>[number]
export type CmsBody = Pick<GuidelineDocument, 'contentModel' | 'sections'>

/** CMS 링크는 사이트 경로·앵커·HTTP(S)만 허용합니다. 렌더 경계에서도 같은 검사를 합니다. */
export function isGuidelineActionHref(value: string | null | undefined): value is string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: URL의 제어 문자 우회를 차단합니다.
	if (!value || value !== value.trim() || /[\\\s\u0000-\u001f\u007f]/.test(value)) return false
	if (value.startsWith('/') && !value.startsWith('//')) return true
	if (value.startsWith('#')) return value.length > 1
	if (!/^https?:\/\//i.test(value)) return false
	try {
		const url = new URL(value)
		return Boolean(url.hostname) && !url.username && !url.password
	} catch {
		return false
	}
}

export const sectionTitle = (section: Pick<CmsSection, 'type' | 'title'>) =>
	section.type === 'incorrect-usages' ? 'Incorrect Usages' : (section.title ?? '')

/** 저장 순서를 유지하며 조회용 위계를 계산한다. CMS 데이터는 변경하지 않는다. */
export function withSectionHierarchy<
	T extends Pick<CmsSection, 'id' | 'anchor' | 'type' | 'title'>,
>(sections: readonly T[]): (T & SectionHierarchy)[] {
	let parentSectionId: string | null = null
	return sections.map((section, index) => {
		const id = section.id || section.anchor || `section-${index}`
		const isSubsection = section.type === 'subsection'
		const result = {
			...section,
			id,
			title: sectionTitle(section),
			headingLevel: isSubsection ? (3 as const) : (2 as const),
			parentSectionId: isSubsection ? parentSectionId : null,
		}
		if (!isSubsection) parentSectionId = id
		return result
	})
}

/** populate되지 않았거나 읽을 수 없는 파일은 링크를 만들지 않는다. */
export function resolveFile(reference: CmsCard['display']['image'] | undefined | null) {
	const file = reference?.value
	if (!file || typeof file !== 'object' || !file.url || !file.filename) return null
	return {
		url: file.url,
		filename: file.filename,
		alt: ('alt' in file ? file.alt : '') || file.name,
	}
}

export function resolveColor(color: number | BrandColor | undefined | null) {
	return color && typeof color === 'object' && isValidHex(color.hex)
		? {
				id: String(color.id),
				label: color.name,
				value: `#${color.hex.replace(/^#/, '')}`,
				cmyk: color.cmyk ?? null,
				pantone: color.pantone ?? null,
			}
		: null
}

/** 선택하지 않은 디스플레이의 숨은 입력값은 다운로드에 섞지 않습니다. */
export function displayFiles(display: CmsCard['display']) {
	const refs =
		display.type === 'image'
			? [display.image]
			: display.type === 'guide'
				? [display.image, display.guide]
				: display.type === 'layout-overlay'
					? (display.images ?? []).map((value) => ({
							relationTo: 'application-images' as const,
							value,
						}))
					: display.type === 'logo-background'
						? [display.logos?.black, display.logos?.white]
						: display.type === 'palette' && display.variant === 'logo-backgrounds'
							? [display.logos?.default, display.logos?.white, display.logos?.mono]
							: []
	const files = refs.flatMap((ref) => {
		const file = resolveFile(ref)
		return file ? [file] : []
	})
	return files.filter(
		(file, index) => files.findIndex((candidate) => candidate.url === file.url) === index,
	)
}

export function cardFiles(card: CmsCard) {
	if (card.download?.source === 'assets') return displayFiles(card.display)
	if (card.download?.source === 'registered')
		return (card.download.files ?? []).flatMap((ref) => {
			const file = resolveFile(ref)
			return file ? [file] : []
		})
	return []
}

export function sectionFiles(section: CmsSection) {
	const files =
		section.download?.source === 'assets'
			? (section.containers ?? []).flatMap((container) =>
					(container.cards ?? []).flatMap((card) => displayFiles(card.display)),
				)
			: section.download?.source === 'registered'
				? (section.download.files ?? []).flatMap((ref) => {
						const file = resolveFile(ref)
						return file ? [file] : []
					})
				: []
	return files.filter(
		(file, index) => files.findIndex((candidate) => candidate.url === file.url) === index,
	)
}

export function needsPaletteCatalog(body: CmsBody) {
	return (
		body.contentModel === 'sections' &&
		body.sections?.some((section) =>
			section.containers?.some((container) =>
				container.cards?.some(({ display }) =>
					['palette', 'logo-background', 'layout-grid', 'layout-overlay'].includes(
						display.type,
					),
				),
			),
		)
	)
}
