import { beforeEach, describe, expect, it, vi } from 'vitest'
import { formatGuidelineReadDocument } from '../domain/reading/format-document'
import { toGuidelineReadDocument } from '../domain/reading/read-document'
import {
	findPublishedMcpGuideline,
	listPublishedMcpGuidelineChecks,
	listPublishedMcpGuidelineDocuments,
} from '../repositories/mcp-guideline.payload.repository'
import { findPaletteCatalog } from '../repositories/palette.payload.repository'
import {
	findMcpChecks,
	findMcpGuideline,
	findMcpGuidelineDocuments,
} from './find-mcp-guideline.service'

vi.mock('../repositories/mcp-guideline.payload.repository', () => ({
	findPublishedMcpGuideline: vi.fn(),
	listPublishedMcpGuidelineChecks: vi.fn(),
	listPublishedMcpGuidelineDocuments: vi.fn(),
}))

vi.mock('../repositories/palette.payload.repository', () => ({ findPaletteCatalog: vi.fn() }))

describe('MCP guideline read service', () => {
	beforeEach(() => vi.resetAllMocks())

	it('기본 페이지 정책을 적용한다', async () => {
		const topics = Array.from({ length: 21 }, (_, index) => ({ id: index + 1 }))
		vi.mocked(listPublishedMcpGuidelineDocuments).mockResolvedValue(topics as never)
		const context = { user: { id: 1 } } as never

		await expect(findMcpGuidelineDocuments(context, { limit: 20 })).resolves.toMatchObject({
			docs: topics.slice(0, 20),
			hasNextPage: true,
			hasPrevPage: false,
			nextPage: 2,
			page: 1,
			pagingCounter: 1,
			prevPage: null,
			totalDocs: 21,
			totalPages: 2,
		})
		expect(listPublishedMcpGuidelineDocuments).toHaveBeenCalledWith(context, 'ko')
	})

	it('Check를 key 순으로 정렬한 뒤 요청 페이지를 반환한다', async () => {
		vi.mocked(listPublishedMcpGuidelineChecks).mockResolvedValue([
			{ key: 'z.last' },
			{ key: 'a.first' },
		] as never)
		const context = {} as never

		await expect(
			findMcpChecks(context, { limit: 1, locale: 'en', page: 2 }),
		).resolves.toMatchObject({
			docs: [{ key: 'z.last' }],
			page: 2,
			totalDocs: 2,
			totalPages: 2,
		})
		expect(listPublishedMcpGuidelineChecks).toHaveBeenCalledWith(context, 'en')
	})

	it('Guideline global 조회를 Repository에 위임한다', async () => {
		const guideline = { id: 1, companyName: 'PROTO' }
		vi.mocked(findPublishedMcpGuideline).mockResolvedValue(guideline as never)
		const context = {} as never

		await expect(findMcpGuideline(context)).resolves.toBe(guideline)
		expect(findPublishedMcpGuideline).toHaveBeenCalledWith(context, 'ko')
	})
})

it('신규 MCP JSON은 공통 읽기 모델과 같으며 같은 모델을 Agent 텍스트로 표현한다', async () => {
	const raw = {
		id: 9,
		title: 'Palette',
		slug: 'palette',
		contentModel: 'sections' as const,
		blocks: [],
		sections: [
			{
				id: 'main',
				type: 'section' as const,
				download: { source: 'none' as const },
				containers: [
					{
						type: 'carousel' as const,
						cards: [
							{
								id: 'palette',
								ratio: '4:3' as const,
								display: { type: 'palette' as const, palette: 'primary' as const },
								caption: { type: 'basic' as const },
								download: { source: 'none' as const },
							},
						],
					},
				],
			},
		],
	}
	const catalog = {
		primary: {
			id: 'p',
			name: 'Primary',
			colors: [{ id: '1', label: 'Green', value: '#008855' }],
		},
	}
	vi.mocked(listPublishedMcpGuidelineDocuments).mockResolvedValue([raw])
	vi.mocked(findPaletteCatalog).mockResolvedValue(catalog)
	const context = { payload: {}, user: { id: 1 } } as never
	const result = await findMcpGuidelineDocuments(context, { locale: 'en' })
	const read = toGuidelineReadDocument(raw, catalog)
	expect(result.docs).toEqual([read])
	expect(findPaletteCatalog).toHaveBeenCalledWith({
		payload: {},
		user: { id: 1 },
		req: context,
		locale: 'en',
	})
	expect(formatGuidelineReadDocument(result.docs[0])).toContain('Copy: 팔레트 전체 복사')
	expect(formatGuidelineReadDocument(result.docs[0])).toContain('"intervalMs":3000')
	expect(result.docs[0]).not.toHaveProperty('blocks')
})
