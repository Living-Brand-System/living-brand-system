import config from '@payload-config'
import { getPayload, type Where } from 'payload'
import type { PaletteCatalog } from '@/features/guideline/domain/contract/palette'
import type { GuidelineSourceDocument } from '@/features/guideline/domain/reading/read-document'
import { findPaletteCatalog } from '@/features/guideline/repositories/palette.payload.repository'
import { needsPaletteCatalog } from '@/features/guideline/sections/model'
import type { GuidelineDocument } from '@/payload-types'

export interface AgentGuidelineListItem {
	chapterId: number | null
	id: number
	title: string
}

export type AgentGuidelineDocument = {
	collection: 'guideline-documents'
	document: GuidelineSourceDocument
	paletteCatalog?: PaletteCatalog
}

type SearchDoc = {
	title?: string | null
	doc?: {
		relationTo?: string | null
		value?: string | number | { id: string | number } | null
	} | null
}

const SEARCH_CANDIDATE_LIMIT = 20

export type AgentGuidelineSearchCandidate = {
	collection: string
	id: string
	title: string
}

/** published+ko(en fallback)+접근제어 공통 조회 옵션 — 이 repo의 가이드라인 질의 전부가 쓴다. */
const publishedKoQuery = (user: unknown) => ({
	draft: false,
	fallbackLocale: 'en' as const,
	locale: 'ko' as const,
	overrideAccess: false,
	user: user as never,
})

export async function listGuidelineDocuments(user: unknown): Promise<AgentGuidelineListItem[]> {
	const payload = await getPayload({ config })
	const documents = await payload.find({
		...publishedKoQuery(user),
		collection: 'guideline-documents',
		depth: 0,
		limit: 2000,
		sort: 'displayOrder',
		select: {
			title: true,
			chapter: true,
		},
	})

	return documents.docs.map((document) => ({
		chapterId: relationshipId(document.chapter),
		id: document.id,
		title: document.title,
	}))
}

export async function findGuidelineSearchPhraseCandidates(
	user: unknown,
	query: string,
): Promise<AgentGuidelineSearchCandidate[]> {
	const payload = await getPayload({ config })
	const results = await findSearchDocuments(payload, user, {
		or: [{ title: { like: query } }, { searchText: { like: query } }],
	})

	return results.docs.map(toSearchCandidate)
}

export async function findGuidelineSearchTermCandidates(
	user: unknown,
	terms: string[],
): Promise<AgentGuidelineSearchCandidate[]> {
	const payload = await getPayload({ config })
	const results = await findSearchDocuments(payload, user, {
		or: terms.flatMap((term): Where[] => [
			{ title: { contains: term } },
			{ searchText: { contains: term } },
		]),
	})

	return results.docs.map(toSearchCandidate)
}

async function findSearchDocuments(
	payload: Awaited<ReturnType<typeof getPayload>>,
	user: unknown,
	where: Where,
) {
	return payload.find({
		collection: 'search',
		depth: 0,
		limit: SEARCH_CANDIDATE_LIMIT,
		overrideAccess: false,
		sort: '-priority',
		user: user as never,
		where,
	})
}

function toSearchCandidate(result: SearchDoc): AgentGuidelineSearchCandidate {
	const value = result.doc?.value
	return {
		collection: result.doc?.relationTo || '',
		id: String(typeof value === 'object' && value ? value.id : value || ''),
		title: result.title || '',
	}
}

export async function findAgentGuidelineDocument(
	user: unknown,
	input: { collection: 'guideline-documents'; id: string },
): Promise<AgentGuidelineDocument | null> {
	const payload = await getPayload({ config })
	const document = await payload.findByID({
		...publishedKoQuery(user),
		collection: 'guideline-documents',
		id: input.id,
		disableErrors: true,
		depth: 2,
		select: {
			title: true,
			slug: true,
			headerImage: true,
			blocks: true,
			contentModel: true,
			sections: true,
			rules: true,
			chapter: true,
			displayOrder: true,
			_status: true,
		},
	})
	if (document?._status !== 'published') return null

	return {
		collection: 'guideline-documents',
		document,
		paletteCatalog: needsPaletteCatalog(document)
			? await findPaletteCatalog({ payload, user: user as never, locale: 'ko' })
			: {},
	}
}

function relationshipId(value: GuidelineDocument['chapter']): number | null {
	if (typeof value === 'number') return value
	return value?.id ?? null
}
