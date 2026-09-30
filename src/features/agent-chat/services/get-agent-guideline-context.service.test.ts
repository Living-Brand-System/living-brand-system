import { beforeEach, describe, expect, it, vi } from 'vitest'
import { formatGuidelineReadDocument } from '@/features/guideline/domain/reading/format-document'
import { toGuidelineReadDocument } from '@/features/guideline/domain/reading/read-document'
import {
	findAgentGuidelineDocument,
	findGuidelineSearchPhraseCandidates,
	findGuidelineSearchTermCandidates,
	listGuidelineDocuments,
} from '../repositories/agent-guideline-context.payload.repository'
import {
	listAgentGuidelineDocuments,
	readAgentGuidelineDocument,
	searchAgentGuidelines,
} from './get-agent-guideline-context.service'

vi.mock('../repositories/agent-guideline-context.payload.repository', () => ({
	findAgentGuidelineDocument: vi.fn(),
	findGuidelineSearchPhraseCandidates: vi.fn(),
	findGuidelineSearchTermCandidates: vi.fn(),
	listGuidelineDocuments: vi.fn(),
}))

describe('searchAgentGuidelines', () => {
	beforeEach(() => vi.clearAllMocks())

	it('문구 결과를 검색어 결과로 보강해 중복 제거 후 제목 일치순으로 반환한다', async () => {
		vi.mocked(findGuidelineSearchPhraseCandidates).mockResolvedValue([
			{ title: 'Brand Product', collection: 'guideline-documents', id: '54' },
			{ title: 'Brand Model', collection: 'other-documents', id: '99' },
		])
		vi.mocked(findGuidelineSearchTermCandidates).mockResolvedValue([
			{ title: 'Brand Product', collection: 'guideline-documents', id: '54' },
			{ title: 'Brand Model', collection: 'guideline-documents', id: '55' },
		])

		await expect(searchAgentGuidelines({ id: 1 }, { query: ' Brand Model ' })).resolves.toEqual(
			[
				{ title: 'Brand Model', collection: 'guideline-documents', id: '55' },
				{ title: 'Brand Product', collection: 'guideline-documents', id: '54' },
			],
		)
		expect(findGuidelineSearchPhraseCandidates).toHaveBeenCalledWith({ id: 1 }, 'Brand Model')
		expect(findGuidelineSearchTermCandidates).toHaveBeenCalledWith({ id: 1 }, [
			'Brand',
			'Model',
		])
	})

	it('빈 검색어는 Repository를 호출하지 않는다', async () => {
		await expect(searchAgentGuidelines({ id: 1 }, { query: '  ' })).resolves.toEqual([])

		expect(findGuidelineSearchPhraseCandidates).not.toHaveBeenCalled()
		expect(findGuidelineSearchTermCandidates).not.toHaveBeenCalled()
	})
})

describe('readAgentGuidelineDocument', () => {
	beforeEach(() => vi.clearAllMocks())

	it('신규 본문은 제목 위계와 카드 경계를 유지하고 레거시 본문을 제외한다', async () => {
		vi.mocked(findAgentGuidelineDocument).mockResolvedValue({
			collection: 'guideline-documents',
			document: {
				id: 7,
				title: 'Logo',
				slug: 'logo',
				contentModel: 'sections',
				blocks: [{ blockType: 'section', title: 'Retired' }],
				sections: [
					{ id: 'main', type: 'section', title: 'Overview' },
					{
						id: 'sub',
						type: 'subsection',
						title: 'Details',
						containers: [
							{
								type: 'grid',
								cards: [
									{
										display: { type: 'image', alt: 'First image' },
										caption: { type: 'basic', title: 'First' },
									},
									{
										display: { type: 'image' },
										caption: {
											type: 'specification',
											title: 'Second',
											rows: [{ label: 'Width', value: '24px' }],
										},
									},
								],
							},
						],
					},
					{ id: 'incorrect', type: 'incorrect-usages' },
				],
			},
		} as never)
		const result = await readAgentGuidelineDocument(
			{ id: 1 },
			{ collection: 'guideline-documents', id: '7' },
		)
		expect(result?.content).toContain('## Overview')
		expect(result?.content).toContain('### Details')
		expect(result?.content).toContain('"parentSectionId":"main"')
		expect(result?.content).toContain('Figure 1 (도판)')
		expect(result?.content).toContain('Title: First')
		expect(result?.content).toContain('Specification (명세):\n- Width: 24px')
		expect(result?.content).toContain('## Incorrect Usages')
		expect(result?.content).not.toContain('Retired')
		expect(result?.truncated).toBe(false)
	})

	it('Page와 Block의 Check를 통합 문서 Agent 결과에 포함한다', async () => {
		vi.mocked(findAgentGuidelineDocument).mockResolvedValue({
			collection: 'guideline-documents',
			document: {
				id: 7,
				title: 'Primary Logo',
				slug: 'primary-logo',
				blocks: [],
				rules: [
					{
						key: 'logo.size.minimum',
						title: 'Minimum size',
						tier: 'required',
					},
				],
				chapter: { id: 1, slug: 'brand', title: 'Brand' },
			},
		} as never)

		const result = await readAgentGuidelineDocument(
			{ id: 1 },
			{
				collection: 'guideline-documents',
				id: '7',
			},
		)

		expect(result?.checks).toEqual([{ key: 'logo.size.minimum', title: 'Minimum size' }])
		expect(result?.content).toContain('Checks:\n- logo.size.minimum: Minimum size')
	})

	it('토픽 Check도 Agent 결과에 포함한다', async () => {
		vi.mocked(findAgentGuidelineDocument).mockResolvedValue({
			collection: 'guideline-documents',
			document: {
				id: 2,
				title: 'Brand Core',
				slug: 'brand-core',
				rules: [
					{
						key: 'brand.core',
						title: 'Brand core',
						tier: 'recommended',
					},
				],
				chapter: { id: 1, slug: 'brand', title: 'Brand' },
			},
		} as never)

		const result = await readAgentGuidelineDocument(
			{ id: 1 },
			{
				collection: 'guideline-documents',
				id: '2',
			},
		)

		expect(result?.checks).toEqual([{ key: 'brand.core', title: 'Brand core' }])
	})

	it('토픽 목록에 소속 챕터 ID를 포함한다', async () => {
		vi.mocked(listGuidelineDocuments).mockResolvedValue([
			{ id: 7, title: 'Primary Logo', chapterId: 2 },
		])

		await expect(listAgentGuidelineDocuments({ id: 1 })).resolves.toEqual([
			{
				chapterId: '2',
				collection: 'guideline-documents',
				id: '7',
				title: 'Primary Logo',
			},
		])
	})
})

it('긴 문서는 읽기 모델을 자르지 않고 전달 결과에만 잘림을 명시한다', async () => {
	vi.mocked(findAgentGuidelineDocument).mockResolvedValue({
		collection: 'guideline-documents',
		document: {
			id: 1,
			title: 'Long',
			slug: 'long',
			contentModel: 'sections',
			sections: [{ type: 'section', title: 'Long section', description: '가'.repeat(7000) }],
		},
	} as never)
	const result = await readAgentGuidelineDocument(
		{},
		{ collection: 'guideline-documents', id: '1' },
	)
	expect(result?.truncated).toBe(true)
	expect(result?.totalContentLength).toBeGreaterThan(7000)
	expect(result?.content).toContain('[Truncated: 6000/')
})

it('Agent도 공통 읽기 모델의 텍스트를 반환하며 관계 해석을 다시 하지 않는다', async () => {
	const document = {
		id: 3,
		title: 'Weights',
		slug: 'weights',
		chapter: { id: 2, title: 'Type', slug: 'type' },
		contentModel: 'sections',
		sections: [
			{
				id: 's',
				type: 'section',
				title: 'Weights',
				containers: [
					{
						type: 'sticky',
						cards: [
							{
								id: 'bold',
								ratio: '4:3',
								display: { type: 'type-weight', weight: 'bold' },
								caption: { type: 'basic', title: 'Bold' },
								download: { source: 'none' },
							},
						],
					},
				],
			},
		],
	} as const
	vi.mocked(findAgentGuidelineDocument).mockResolvedValue({
		collection: 'guideline-documents',
		document,
	} as never)
	const result = await readAgentGuidelineDocument(
		{},
		{ collection: 'guideline-documents', id: '3' },
	)
	const read = toGuidelineReadDocument(document as never)
	expect(result?.content).toBe(formatGuidelineReadDocument(read))
	expect(result?.source.href).toBe('/guideline/type/weights')
	expect(result?.checks).toEqual(read.checks)
	expect(result?.truncated).toBe(false)
})
