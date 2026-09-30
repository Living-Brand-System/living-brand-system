import config from '@payload-config'
import { getPayload } from 'payload'
import { DEFAULT_LOCALE, FALLBACK_LOCALE } from '@/lib/locale'
import type { GuidelineDocument, User } from '@/payload-types'

export interface DraftGuidelineDocumentData
	extends Pick<GuidelineDocument, 'contentModel' | 'sections'> {
	blocks: GuidelineDocument['blocks']
	chapterSlug: string | null
	displayOrder: number
	headerImage: GuidelineDocument['headerImage']
	id: number
	slug: string
	title: string
}

/** 권한이 적용된 draft Guideline 문서를 preview DTO로 변환해 조회한다. */
export async function findDraftGuidelineDocumentById(
	documentId: number,
	user: User,
): Promise<DraftGuidelineDocumentData | null> {
	const payload = await getPayload({ config })

	const document = await payload.findByID({
		collection: 'guideline-documents',
		id: documentId,
		depth: 2,
		disableErrors: true,
		draft: true,
		fallbackLocale: FALLBACK_LOCALE,
		locale: DEFAULT_LOCALE,
		overrideAccess: false,
		user,
	})

	return document ? toDraftGuidelineDocument(document) : null
}

function toDraftGuidelineDocument(document: GuidelineDocument): DraftGuidelineDocumentData {
	return {
		blocks: document.blocks ?? [],
		contentModel: document.contentModel,
		sections: document.sections,
		chapterSlug:
			typeof document.chapter === 'object' && document.chapter ? document.chapter.slug : null,
		displayOrder: typeof document.displayOrder === 'number' ? document.displayOrder : -1,
		headerImage: document.headerImage ?? null,
		id: document.id,
		slug: document.slug,
		title: document.title,
	}
}
