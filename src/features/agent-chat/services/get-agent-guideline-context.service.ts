import { formatGuidelineReadDocument } from '@/features/guideline/domain/reading/format-document'
import {
	type GuidelineReadDocument,
	toGuidelineReadDocument,
} from '@/features/guideline/domain/reading/read-document'
import {
	type AgentGuidelineSearchCandidate,
	findAgentGuidelineDocument,
	findGuidelineSearchPhraseCandidates,
	findGuidelineSearchTermCandidates,
	listGuidelineDocuments,
} from '../repositories/agent-guideline-context.payload.repository'

const MAX_DOCUMENT_CONTENT_LENGTH = 6000
const SEARCH_RESULT_LIMIT = 10
const SEARCH_TERM_LIMIT = 8

export type AgentGuidelineSearchResult = {
	title: string
	collection: 'guideline-documents'
	id: string
}

/**
 * Agent tool에 제공할 published guideline 문서 목록을 조립한다.
 * Payload Local API 호출과 접근 제어는 agent guideline context repository가 담당한다.
 */
export async function listAgentGuidelineDocuments(user: unknown) {
	const documents = await listGuidelineDocuments(user)
	return documents.map((document) => ({
		collection: 'guideline-documents' as const,
		chapterId: document.chapterId?.toString() ?? null,
		id: String(document.id),
		title: document.title,
	}))
}

/**
 * Agent tool의 guideline 검색 후보를 보강·중복 제거·순위화한다.
 * Payload 후보 조회와 DTO 변환은 agent guideline context repository가 담당한다.
 */
export async function searchAgentGuidelines(
	user: unknown,
	input: { query: string },
): Promise<AgentGuidelineSearchResult[]> {
	const query = input.query.trim()
	if (!query) return []

	const terms = searchTerms(query)
	const phraseCandidates = await findGuidelineSearchPhraseCandidates(user, query)
	const candidates =
		phraseCandidates.length < SEARCH_RESULT_LIMIT
			? dedupeSearchCandidates([
					...phraseCandidates,
					...(await findGuidelineSearchTermCandidates(user, terms)),
				])
			: phraseCandidates

	return candidates
		.filter((candidate) => candidate.collection === 'guideline-documents')
		.map((candidate) => ({
			title: candidate.title,
			collection: 'guideline-documents' as const,
			id: candidate.id,
		}))
		.filter((result) => result.title && result.id)
		.sort((a, b) => titleMatchCount(b.title, terms) - titleMatchCount(a.title, terms))
		.slice(0, SEARCH_RESULT_LIMIT)
}

/**
 * Agent tool이 읽은 guideline 문서를 LLM용 본문으로 변환한다.
 * Payload 문서 조회는 agent guideline context repository가 담당한다.
 */
export async function readAgentGuidelineDocument(
	user: unknown,
	input: { collection: 'guideline-documents'; id: string },
) {
	const result = await findAgentGuidelineDocument(user, input)
	if (!result) return null

	const document = toGuidelineReadDocument(result.document, result.paletteCatalog)
	const id = String(document.id)
	const content = formatGuidelineReadDocument(document)
	return {
		title: document.title,
		collection: 'guideline-documents' as const,
		id,
		source: {
			collection: 'guideline-documents' as const,
			id,
			title: document.title,
			href: documentHref(document),
		},
		checks: document.checks,
		content: limitContent(content),
		truncated: content.length > MAX_DOCUMENT_CONTENT_LENGTH,
		totalContentLength: content.length,
	}
}

function searchTerms(query: string): string[] {
	return [...new Set(query.split(/\s+/).filter(Boolean))].slice(0, SEARCH_TERM_LIMIT)
}

function dedupeSearchCandidates(
	candidates: AgentGuidelineSearchCandidate[],
): AgentGuidelineSearchCandidate[] {
	return [
		...new Map(
			candidates.map((candidate) => [`${candidate.collection}:${candidate.id}`, candidate]),
		).values(),
	]
}

function titleMatchCount(title: string, terms: string[]): number {
	const normalizedTitle = title.toLocaleLowerCase()
	return terms.filter((term) => normalizedTitle.includes(term.toLocaleLowerCase())).length
}

function documentHref(document: GuidelineReadDocument): string | null {
	return document.chapter?.slug ? `/guideline/${document.chapter.slug}/${document.slug}` : null
}

function limitContent(value: string): string {
	return value.length > MAX_DOCUMENT_CONTENT_LENGTH
		? `${value.slice(0, MAX_DOCUMENT_CONTENT_LENGTH)}\n[Truncated: ${MAX_DOCUMENT_CONTENT_LENGTH}/${value.length} characters]`
		: value
}
