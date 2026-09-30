import type {
	GuidelineBlocks,
	GuidelineHeaderImage,
} from '@/features/guideline/domain/contract/guideline'
import {
	findChapterBySlug,
	findPublishedTopicBySlug,
} from '@/features/guideline/repositories/guideline-view.payload.repository'
import type { PaletteCatalog } from '../domain/contract/palette'
import { findPaletteCatalog } from '../repositories/palette.payload.repository'
import type { CmsBody } from '../sections/model'
import { needsPaletteCatalog } from '../sections/model'

export interface GetGuidelineTopicOutput extends CmsBody {
	title: string
	paletteCatalog?: PaletteCatalog
	headerImage: GuidelineHeaderImage
	blocks: GuidelineBlocks
}

/**
 * Creator UI는 발행된 토픽 본문만 읽는다. 섹션은 그 본문 안의 `section` 블록이라 별도 조회가 없다.
 * 토픽 슬러그는 장 안에서만 유일하므로 먼저 장으로 스코프한 뒤 토픽을 찾는다.
 * Payload 조회는 guideline-view repository가 소유한다.
 */
export async function getGuidelineTopic(
	chapterSlug: string,
	topicSlug: string,
): Promise<GetGuidelineTopicOutput | null> {
	const chapter = await findChapterBySlug(chapterSlug)

	if (!chapter) {
		return null
	}

	const topic = await findPublishedTopicBySlug(chapter.id, topicSlug)

	if (!topic) {
		return null
	}

	return {
		title: topic.title,
		contentModel: topic.contentModel,
		sections: topic.sections,
		paletteCatalog: needsPaletteCatalog(topic) ? await findPaletteCatalog() : undefined,
		headerImage: topic.headerImage ?? null,
		blocks: topic.blocks ?? [],
	}
}
