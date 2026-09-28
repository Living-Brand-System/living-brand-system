import { cache } from 'react'
import type {
	GuidelineChapterData,
	GuidelineNavigationTopicData,
} from '@/features/guideline/domain/contract/guideline'
import {
	listGuidelineChapters,
	listPublishedGuidelineNavigationTopics,
} from '@/features/guideline/repositories/guideline-view.payload.repository'
import {
	type GetGuidelineMetadataOutput,
	getGuidelineMetadata,
} from './get-guideline-metadata.service'

export interface GetGuidelineNavigationOutput {
	metadata: GetGuidelineMetadataOutput
	title: string
	chapters: {
		id: number
		title: string
		topics: {
			id: number
			title: string
			href: string
			sections: (GuidelineNavigationTopicData['sections'][number] & { href: string })[]
		}[]
	}[]
}

/**
 * Creator UI 사이드바와 인덱스는 발행된 가이드라인의 목차 정보만 읽는다(챕터 → 토픽 → 섹션).
 * 본문 렌더링은 topic service가 담당한다.
 * Payload 조회는 guideline-view repository가 소유한다.
 */
export const getGuidelineNavigation = cache(async (): Promise<GetGuidelineNavigationOutput> => {
	const [metadata, chapters, topics] = await Promise.all([
		getGuidelineMetadata(),
		listGuidelineChapters(),
		listPublishedGuidelineNavigationTopics(),
	])

	return {
		metadata,
		title: metadata.documentTitle,
		chapters: buildGuidelineNavigationChapters(chapters, topics),
	}
})

/**
 * 챕터와 토픽을 목차 트리로 조립하는 순수 함수. 외부 I/O 없음
 * (Payload 조회는 guideline-view repository 소유). 단위 테스트 재사용을 위해 export한다.
 *
 * 🔴 URL은 여기서 만든다. 2026-08-26까지는 nested-docs가 breadcrumb에 심어 준 것을 읽었는데,
 *    챕터가 별도 컬렉션이 되면서 계층이 사라졌다. 조각이 둘뿐이라 조립이 더 싸다.
 * 🔴 **챕터는 링크를 갖지 않는다.** 자기 화면이 없다 — 사이드바는 `/guideline`으로 보낸다.
 */
export function buildGuidelineNavigationChapters(
	chapters: GuidelineChapterData[],
	topics: GuidelineNavigationTopicData[],
) {
	return chapters.map((chapter) => ({
		id: chapter.id,
		title: chapter.title,
		topics: topics
			.filter((topic) => topic.chapterId === chapter.id)
			.map((topic) => {
				const href = `/guideline/${chapter.slug}/${topic.slug}`
				return {
					id: topic.id,
					title: topic.title,
					href,
					sections: topic.sections.map((section) => ({
						...section,
						href: `${href}#${section.anchor}`,
					})),
				}
			}),
	}))
}
