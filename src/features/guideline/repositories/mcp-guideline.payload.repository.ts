import type { PayloadRequest } from 'payload'
import type { Guideline, Rule } from '@/payload-types'
import { collectGuidelineCheckSources } from '../checks/collect-guideline-check-sources'
import { formatCheckEvidence } from '../checks/format-check-evidence'
import type { GuidelineSourceDocument } from '../domain/reading/read-document'
import { findPublishedUnifiedGuidelineCheckDocuments } from './published-guideline-checks.payload.repository'

export interface McpGuidelineCheck {
	evidence: string
	key: string
	source: { documentId: number }
	tier: Rule['tier']
	title: string
}

/** 접근 제어된 원본 조회만 담당한다. 읽기 모델 변환은 service에서 수행한다. */
export async function listPublishedMcpGuidelineDocuments(
	req: PayloadRequest,
	locale: 'en' | 'ko',
): Promise<GuidelineSourceDocument[]> {
	const { docs } = await req.payload.find({
		collection: 'guideline-documents',
		depth: 2,
		draft: false,
		fallbackLocale: 'en',
		limit: 2000,
		locale,
		overrideAccess: false,
		pagination: false,
		req,
		sort: 'displayOrder',
		user: req.user,
		select: {
			title: true,
			slug: true,
			headerImage: true,
			rules: true,
			blocks: true,
			contentModel: true,
			sections: true,
			displayOrder: true,
			chapter: true,
		},
	})

	return docs.map((document) => ({
		id: document.id,
		title: document.title,
		slug: document.slug,
		headerImage: document.headerImage,
		rules: document.rules,
		contentModel: document.contentModel,
		sections: document.sections,
		blocks: document.blocks,
		displayOrder: document.displayOrder,
		chapter: document.chapter,
	}))
}

/** published Guideline Check를 MCP check DTO로 변환한다. */
export async function listPublishedMcpGuidelineChecks(
	req: PayloadRequest,
	locale: 'en' | 'ko',
): Promise<McpGuidelineCheck[]> {
	const { documents } = await findPublishedUnifiedGuidelineCheckDocuments(req.payload, {
		locale,
		overrideAccess: false,
		user: req.user,
	})

	return documents.flatMap((document) =>
		collectGuidelineCheckSources(document).map(({ rule, evidence, source }) => ({
			key: rule.key,
			title: rule.title,
			tier: rule.tier,
			evidence: formatCheckEvidence(evidence),
			source,
		})),
	)
}

/** live Guideline global을 MCP 응답 DTO로 변환한다. */
export async function findPublishedMcpGuideline(
	req: PayloadRequest,
	locale: 'en' | 'ko',
): Promise<Guideline> {
	const guideline = await req.payload.findGlobal({
		slug: 'guideline',
		depth: 1,
		draft: false,
		fallbackLocale: 'en',
		locale,
		overrideAccess: false,
		req,
		user: req.user,
	})

	return {
		id: guideline.id,
		companyName: guideline.companyName,
		documentTitle: guideline.documentTitle,
		issuedLabel: guideline.issuedLabel,
		favicon: guideline.favicon,
		primaryColor: guideline.primaryColor,
		primaryColorDark: guideline.primaryColorDark,
		_status: guideline._status,
		updatedAt: guideline.updatedAt,
		createdAt: guideline.createdAt,
	}
}
