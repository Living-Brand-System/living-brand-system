import type { GuidelineDocument } from '@/payload-types'

/** CMS 저장 필드가 아닌 문서 조회 시 계산되는 섹션 위계. */
export interface SectionHierarchy {
	id: string
	headingLevel: 2 | 3
	parentSectionId: string | null
}

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
	/** 가이드라인 첫 화면에서 챕터 제목 아래에 서는 설명. */
	description: string | null
	displayOrder: number
	id: number
	slug: string
	title: string
}

export interface GuidelineNavigationTopicData {
	chapterId: number | null
	/** 가이드라인 첫 화면의 토픽 카드 설명. */
	description: string | null
	id: number
	sections: (SectionHierarchy & { anchor: string; title: string })[]
	slug: string
	/** 토픽 카드 썸네일 — 문서의 `headerImage`. 없으면 빈 판이다. */
	thumbnail: { src: string; alt: string } | null
	title: string
}

export interface GuidelineTopicData extends Pick<GuidelineDocument, 'sections'> {
	headerImage: GuidelineHeaderImage
	id: number
	title: string
}
