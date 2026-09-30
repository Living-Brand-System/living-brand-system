import config from '@payload-config'
import { getPayload } from 'payload'
import { FALLBACK_LOCALE, DEFAULT_LOCALE as LOCALE } from '@/lib/locale'
import type { GuidelineDocument } from '@/payload-types'
import type {
	GuidelineChapterData,
	GuidelineMetadataData,
	GuidelineNavigationTopicData,
	GuidelineTopicData,
} from '../domain/contract/guideline'
import { withSectionHierarchy } from '../sections/model'

/**
 * Creator UI 렌더링용 published guideline 조회 repository.
 * guideline read service가 쓰는 Payload Local API 호출은 모두 이 파일이 소유한다.
 */

export async function findGuidelineMetadataGlobal(): Promise<GuidelineMetadataData> {
	const payload = await getPayload({ config })

	const guideline = await payload.findGlobal({
		slug: 'guideline',
		depth: 1,
		locale: LOCALE,
		fallbackLocale: FALLBACK_LOCALE,
		draft: false,
		select: {
			companyName: true,
			documentTitle: true,
			favicon: true,
			issuedLabel: true,
			primaryColor: true,
			primaryColorDark: true,
		},
	})

	return {
		companyName: guideline.companyName,
		documentTitle: guideline.documentTitle,
		faviconHref: relationshipString(guideline.favicon, 'url'),
		issuedLabel: guideline.issuedLabel || null,
		primaryDarkHex: relationshipString(guideline.primaryColorDark, 'hex'),
		primaryHex: relationshipString(guideline.primaryColor, 'hex'),
	}
}

/** 목차의 그룹. 챕터는 자기 화면이 없으므로 제목·slug·순서만 읽는다. */
export async function listGuidelineChapters(): Promise<GuidelineChapterData[]> {
	const payload = await getPayload({ config })
	const chapters = await payload.find({
		collection: 'guideline-chapters',
		depth: 0,
		fallbackLocale: FALLBACK_LOCALE,
		limit: 100,
		locale: LOCALE,
		sort: 'displayOrder',
		select: { title: true, slug: true, displayOrder: true },
	})

	return chapters.docs.map((chapter) => ({
		displayOrder: chapter.displayOrder,
		id: chapter.id,
		slug: chapter.slug,
		title: chapter.title,
	}))
}

export async function listPublishedGuidelineNavigationTopics(): Promise<
	GuidelineNavigationTopicData[]
> {
	const payload = await getPayload({ config })
	const documents = await payload.find({
		collection: 'guideline-documents',
		depth: 0,
		draft: false,
		fallbackLocale: FALLBACK_LOCALE,
		limit: 2000,
		locale: LOCALE,
		sort: 'displayOrder',
		select: {
			title: true,
			slug: true,
			displayOrder: true,
			chapter: true,
			// 🔴 섹션 목차는 `section` 블록에서 나온다. blockType별로 골라 담으면 나머지 블록
			//    테이블(blk·img·위젯 20종)은 조인 자체가 일어나지 않는다
			//    (`@payloadcms/drizzle` find/traverseFields.js — 목록에 없는 블록은 빈 select로 접힌다).
			blocks: { section: { anchor: true, title: true } },
			contentModel: true,
			sections: { id: true, type: true, anchor: true, title: true },
		},
	})

	return documents.docs.map((document) => ({
		chapterId: relationshipId(document.chapter),
		id: document.id,
		sections:
			document.contentModel === 'sections'
				? withSectionHierarchy(document.sections ?? []).flatMap((section) =>
						section.anchor
							? [
									{
										id: section.id,
										anchor: section.anchor,
										title: section.title ?? '',
										headingLevel: section.headingLevel,
										parentSectionId: section.parentSectionId,
									},
								]
							: [],
					)
				: (document.blocks ?? []).flatMap((block) =>
						// 제목 없는 섹션(히어로)은 앵커도 목차 항목도 없다.
						block.blockType === 'section' && block.anchor && block.title
							? [
									{
										id: block.id || block.anchor,
										anchor: block.anchor,
										title: block.title,
										headingLevel: 2 as const,
										parentSectionId: null,
									},
								]
							: [],
					),
		slug: document.slug,
		title: document.title,
	}))
}

export async function findChapterBySlug(chapterSlug: string): Promise<GuidelineChapterData | null> {
	const payload = await getPayload({ config })
	const chapters = await payload.find({
		collection: 'guideline-chapters',
		depth: 0,
		fallbackLocale: FALLBACK_LOCALE,
		limit: 1,
		locale: LOCALE,
		where: { slug: { equals: chapterSlug } },
		select: { title: true, slug: true, displayOrder: true },
	})

	const chapter = chapters.docs[0]
	return chapter
		? {
				displayOrder: chapter.displayOrder,
				id: chapter.id,
				slug: chapter.slug,
				title: chapter.title,
			}
		: null
}

export async function findPublishedTopicBySlug(
	chapterId: number,
	topicSlug: string,
): Promise<GuidelineTopicData | null> {
	const payload = await getPayload({ config })
	// depth 1: 섹션(section) 블록이 품은 이미지(application-images)·색상(brand-colors) 관계를
	// populate해야 렌더된다. 섹션 자신의 면(background)도 같은 depth로 hex까지 채워진다.
	const topics = await payload.find({
		collection: 'guideline-documents',
		depth: 1,
		draft: false,
		fallbackLocale: FALLBACK_LOCALE,
		limit: 1,
		locale: LOCALE,
		where: {
			and: [{ slug: { equals: topicSlug } }, { chapter: { equals: chapterId } }],
		},
		select: {
			title: true,
			slug: true,
			headerImage: true,
			blocks: true,
			contentModel: true,
			sections: true,
		},
	})

	const topic = topics.docs[0]
	return topic
		? {
				blocks: topic.blocks ?? [],
				contentModel: topic.contentModel,
				sections: topic.sections,
				headerImage: topic.headerImage ?? null,
				id: topic.id,
				title: topic.title,
			}
		: null
}

function relationshipId(value: GuidelineDocument['chapter']): number | null {
	if (typeof value === 'number') return value
	return value?.id ?? null
}

function relationshipString(value: unknown, key: string): string | null {
	if (!value || typeof value !== 'object' || !(key in value)) return null
	const candidate = (value as Record<string, unknown>)[key]
	return typeof candidate === 'string' ? candidate : null
}
