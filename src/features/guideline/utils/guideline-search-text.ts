import type { GuidelineDocument } from '@/payload-types'
import { formatBlockForAgent } from '../blocks/projection'
import { projectSection } from '../sections/projection'
import { compact } from './block-text'

export interface GuidelineSearchRuleSummary {
	key: string
	title: string
}

/** 발행 가이드라인의 검색 대상을 localized 평문으로 평탄화한다. Rule 요약은 호출자가 조회해 전달한다. */
export function buildGuidelineSearchText(
	document: GuidelineDocument,
	rules: GuidelineSearchRuleSummary[] = [],
): string {
	return compact([
		document.title,
		document.slug,
		typeof document.chapter === 'object' && document.chapter ? document.chapter.title : null,
		...(document.contentModel === 'sections'
			? (document.sections ?? []).map((section) => projectSection(section).text)
			: (document.blocks?.map(formatBlockForAgent) ?? [])),
		...rules.map(({ key, title }) => `${key} ${title}`),
	]).join('\n')
}
