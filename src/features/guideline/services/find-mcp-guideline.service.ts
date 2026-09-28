import { toGuidelineReadDocument } from '../domain/reading/read-document'
import {
	findPublishedMcpGuideline,
	listPublishedMcpGuidelineChecks,
	listPublishedMcpGuidelineDocuments,
} from '../repositories/mcp-guideline.payload.repository'
import { findPaletteCatalog } from '../repositories/palette.payload.repository'
import { needsPaletteCatalog } from '../sections/model'

export interface FindMcpGuidelineListInput {
	limit?: number
	locale?: 'en' | 'ko'
	page?: number
}

type McpGuidelineReadContext = Parameters<typeof listPublishedMcpGuidelineDocuments>[0]

/**
 * MCP 문서 목록의 페이지 정책을 적용한다.
 * Payload 조회는 repository, 문서 의미 해석은 공통 읽기 모델이 소유한다.
 */
export async function findMcpGuidelineDocuments(
	context: McpGuidelineReadContext,
	input: FindMcpGuidelineListInput = {},
) {
	// 🔴 level 필터가 없다. 계층이 사라져(2026-08-26) 문서는 전부 토픽이고, 챕터는 별도 컬렉션이다.
	const filteredDocuments = await listPublishedMcpGuidelineDocuments(
		context,
		input.locale ?? 'ko',
	)
	const limit = input.limit ?? 100
	const page = input.page ?? 1
	const totalPages = Math.ceil(filteredDocuments.length / limit)

	const pageDocuments = filteredDocuments.slice((page - 1) * limit, page * limit)
	const catalog = pageDocuments.some(needsPaletteCatalog)
		? await findPaletteCatalog({
				payload: context.payload,
				user: context.user,
				req: context,
				locale: input.locale ?? 'ko',
			})
		: {}
	return {
		docs: pageDocuments.map((document) => toGuidelineReadDocument(document, catalog)),
		hasNextPage: page < totalPages,
		hasPrevPage: page > 1,
		nextPage: page < totalPages ? page + 1 : null,
		page,
		pagingCounter: (page - 1) * limit + 1,
		prevPage: page > 1 ? page - 1 : null,
		totalDocs: filteredDocuments.length,
		totalPages,
	}
}

/**
 * MCP Check 목록을 key 순으로 정렬하고 페이지 정책을 적용한다.
 * Payload 조회와 Check DTO 변환은 mcp-guideline repository가 소유한다.
 */
export async function findMcpChecks(
	context: McpGuidelineReadContext,
	input: FindMcpGuidelineListInput = {},
) {
	const checks = await listPublishedMcpGuidelineChecks(context, input.locale ?? 'ko')
	checks.sort((a, b) => a.key.localeCompare(b.key))
	const limit = input.limit ?? 100
	const page = input.page ?? 1

	return {
		docs: checks.slice((page - 1) * limit, page * limit),
		page,
		totalDocs: checks.length,
		totalPages: Math.ceil(checks.length / limit),
	}
}

/**
 * MCP가 사용할 live Guideline global을 조회한다.
 * Payload 조회와 DTO 변환은 mcp-guideline repository가 소유한다.
 */
export async function findMcpGuideline(
	context: McpGuidelineReadContext,
	input: Pick<FindMcpGuidelineListInput, 'locale'> = {},
) {
	return findPublishedMcpGuideline(context, input.locale ?? 'ko')
}
