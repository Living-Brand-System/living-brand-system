import config from '@payload-config'
import { getPayload } from 'payload'
import {
	collectGuidelineCheckSources,
	type GuidelineCheckSource,
} from '@/features/guideline/checks/collect-guideline-check-sources'
import { findPublishedUnifiedGuidelineCheckDocuments } from '@/features/guideline/repositories/published-guideline-checks.payload.repository'
import { DEFAULT_LOCALE as LOCALE } from '@/lib/locale'
import type { GuidelineDocument } from '@/payload-types'

export interface CheckRulesetSourceDocument {
	id: number
	title: string
	slug: string
	displayOrder: number
	// 🔴 챕터는 별도 컬렉션이다(2026-08-26). 계층을 breadcrumb에서 읽던 자리를 관계가 대신한다.
	chapter: { title: string; slug: string; displayOrder: number } | null
	checks: GuidelineCheckSource[]
}

/** 검수 기준인 published 통합 Guideline 문서와 내부 Check source를 조회한다. */
export async function getCheckSourceDocuments(): Promise<{
	documents: CheckRulesetSourceDocument[]
}> {
	const payload = await getPayload({ config })
	const { documents } = await findPublishedUnifiedGuidelineCheckDocuments(payload, {
		locale: LOCALE,
		overrideAccess: true,
	})

	return { documents: documents.map(toCheckRulesetSourceDocument) }
}

function toCheckRulesetSourceDocument(document: GuidelineDocument): CheckRulesetSourceDocument {
	return {
		id: document.id,
		title: document.title,
		slug: document.slug,
		displayOrder: document.displayOrder,
		chapter:
			typeof document.chapter === 'object' && document.chapter
				? {
						title: document.chapter.title,
						slug: document.chapter.slug,
						displayOrder: document.chapter.displayOrder,
					}
				: null,
		checks: collectGuidelineCheckSources(document),
	}
}
