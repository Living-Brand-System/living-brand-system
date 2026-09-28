import type { GuidelineDocument } from '@/payload-types'

/** CMS 저장 필드가 아닌 문서 조회 시 계산되는 섹션 위계. */
export interface SectionHierarchy {
	id: string
	headingLevel: 2 | 3
	parentSectionId: string | null
}

export type GuidelineBlocks = GuidelineDocument['blocks']
export type GuidelineHeaderImage = GuidelineDocument['headerImage']

export interface GuidelineMetadataData {
	companyName: string
	documentTitle: string
	faviconHref: string | null
	issuedLabel: string | null
	primaryDarkHex: string | null
	primaryHex: string | null
}

export interface GuidelineChapterData {
	displayOrder: number
	id: number
	slug: string
	title: string
}

export interface GuidelineNavigationTopicData {
	chapterId: number | null
	id: number
	sections: (SectionHierarchy & { anchor: string; title: string })[]
	slug: string
	title: string
}

export interface GuidelineTopicData extends Pick<GuidelineDocument, 'contentModel' | 'sections'> {
	blocks: GuidelineBlocks
	headerImage: GuidelineHeaderImage
	id: number
	title: string
}
