import { getPayload } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import {
	findAgentGuidelineDocument,
	findGuidelineSearchPhraseCandidates,
	findGuidelineSearchTermCandidates,
	listGuidelineDocuments,
} from './agent-guideline-context.payload.repository'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))

describe('listGuidelineDocuments', () => {
	it('Agent 경로는 기존 ko → en fallback과 published 필터를 유지한다', async () => {
		const find = vi.fn().mockResolvedValue({
			docs: [
				{
					id: 7,
					title: 'Primary Logo',
					chapter: { id: 2 },
				},
			],
		})
		vi.mocked(getPayload).mockResolvedValue({ find } as never)

		await expect(listGuidelineDocuments({ id: 1 })).resolves.toEqual([
			{ chapterId: 2, id: 7, title: 'Primary Logo' },
		])

		expect(find).toHaveBeenCalledWith(
			expect.objectContaining({
				collection: 'guideline-documents',
				draft: false,
				fallbackLocale: 'en',
				locale: 'ko',
			}),
		)
		expect(find.mock.calls[0]?.[0]).not.toHaveProperty('where')
	})
})

describe('guideline search candidates', () => {
	it('문구 검색을 Payload 조건으로 변환하고 후보 DTO를 반환한다', async () => {
		const find = vi.fn().mockResolvedValue({
			docs: [
				{
					title: 'Brand Model',
					doc: { relationTo: 'guideline-documents', value: 54 },
				},
			],
		})
		vi.mocked(getPayload).mockResolvedValue({ find } as never)

		await expect(
			findGuidelineSearchPhraseCandidates({ id: 1 }, 'Brand Model'),
		).resolves.toEqual([{ title: 'Brand Model', collection: 'guideline-documents', id: '54' }])
		expect(find).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					or: [
						{ title: { like: 'Brand Model' } },
						{ searchText: { like: 'Brand Model' } },
					],
				},
			}),
		)
	})

	it('분해된 검색어를 Payload 부분 일치 조건으로 변환한다', async () => {
		const find = vi.fn().mockResolvedValue({ docs: [] })
		vi.mocked(getPayload).mockResolvedValue({ find } as never)

		await findGuidelineSearchTermCandidates({ id: 1 }, ['모델', '사진'])

		expect(find).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					or: [
						{ title: { contains: '모델' } },
						{ searchText: { contains: '모델' } },
						{ title: { contains: '사진' } },
						{ searchText: { contains: '사진' } },
					],
				},
			}),
		)
	})
})

describe('findAgentGuidelineDocument', () => {
	it('Payload 챕터 관계를 Agent DTO로 변환한다', async () => {
		const findByID = vi.fn().mockResolvedValue({
			id: 2,
			title: 'Logo',
			slug: 'logo',
			headerImage: null,
			blocks: [],
			checks: [],
			_status: 'published',
		})
		const find = vi.fn().mockResolvedValue({
			docs: [{ id: 3, title: 'Primary', slug: 'primary' }],
		})
		vi.mocked(getPayload).mockResolvedValue({ find, findByID } as never)

		await expect(
			findAgentGuidelineDocument({ id: 1 }, { collection: 'guideline-documents', id: '2' }),
		).resolves.toMatchObject({
			document: {
				id: 2,
				title: 'Logo',
			},
		})
	})
})
