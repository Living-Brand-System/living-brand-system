import type { PayloadRequest } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { collectGuidelineCheckSources } from '../checks/collect-guideline-check-sources'
import { formatCheckEvidence } from '../checks/format-check-evidence'
import {
	findPublishedMcpGuideline,
	listPublishedMcpGuidelineChecks,
	listPublishedMcpGuidelineDocuments,
} from './mcp-guideline.payload.repository'
import { findPublishedUnifiedGuidelineCheckDocuments } from './published-guideline-checks.payload.repository'

vi.mock('../checks/collect-guideline-check-sources', () => ({
	collectGuidelineCheckSources: vi.fn(),
}))
vi.mock('../checks/format-check-evidence', () => ({ formatCheckEvidence: vi.fn() }))
vi.mock('./published-guideline-checks.payload.repository', () => ({
	findPublishedUnifiedGuidelineCheckDocuments: vi.fn(),
}))

describe('MCP guideline Payload repository', () => {
	beforeEach(() => vi.resetAllMocks())

	it('published 문서를 접근 제어된 Local API로 조회한다', async () => {
		const find = vi.fn().mockResolvedValue({
			docs: [
				{
					id: 7,
					title: 'Logo',
					slug: 'logo',
					headerImage: 11,
					rules: [],
					blocks: [],
					displayOrder: 2,
					chapter: 3,
					ignoredPersistenceField: 'do not expose',
				},
			],
		})
		const user = { id: 42 }
		const req = { payload: { find }, user } as unknown as PayloadRequest

		await expect(listPublishedMcpGuidelineDocuments(req, 'en')).resolves.toEqual([
			{
				id: 7,
				title: 'Logo',
				slug: 'logo',
				headerImage: 11,
				rules: [],
				blocks: [],
				contentModel: undefined,
				displayOrder: 2,
				chapter: 3,
			},
		])
		expect(find).toHaveBeenCalledWith(
			expect.objectContaining({
				collection: 'guideline-documents',
				locale: 'en',
				overrideAccess: false,
				pagination: false,
				req,
				user,
			}),
		)
	})

	it('저장 원본의 활성 모델과 순서를 변경하지 않는다', async () => {
		const document = {
			id: 1,
			contentModel: 'sections',
			sections: [{ id: 'main' }, { id: 'sub' }],
			blocks: [{ title: 'retired' }],
		}
		const find = vi.fn().mockResolvedValue({ docs: [document] })
		const result = await listPublishedMcpGuidelineDocuments(
			{ payload: { find } } as unknown as PayloadRequest,
			'ko',
		)
		expect(result[0]).toMatchObject(document)
		expect(result[0].sections?.[0]).not.toHaveProperty('headingLevel')
	})

	it('published Rule source를 MCP DTO로 변환한다', async () => {
		const document = { id: 9 }
		const source = { documentId: 9 }
		vi.mocked(findPublishedUnifiedGuidelineCheckDocuments).mockResolvedValue({
			documents: [document],
		} as never)
		vi.mocked(collectGuidelineCheckSources).mockReturnValue([
			{
				rule: { key: 'logo.clear-space', title: 'Clear space', tier: 'required' },
				evidence: { type: 'mediaShowcase' },
				source,
			},
		] as never)
		vi.mocked(formatCheckEvidence).mockReturnValue('Media showcase')
		const payload = {}
		const user = { id: 42 }
		const req = { payload, user } as unknown as PayloadRequest

		await expect(listPublishedMcpGuidelineChecks(req, 'ko')).resolves.toEqual([
			{
				key: 'logo.clear-space',
				title: 'Clear space',
				tier: 'required',
				evidence: 'Media showcase',
				source,
			},
		])
		expect(findPublishedUnifiedGuidelineCheckDocuments).toHaveBeenCalledWith(payload, {
			locale: 'ko',
			overrideAccess: false,
			user,
		})
	})

	it('live Guideline global을 접근 제어된 Local API로 읽고 DTO로 변환한다', async () => {
		const findGlobal = vi.fn().mockResolvedValue({
			id: 1,
			companyName: 'PROTO',
			documentTitle: 'Brand Guideline',
			issuedLabel: '2026',
			favicon: 3,
			primaryColor: 4,
			primaryColorDark: 5,
			_status: 'published',
			updatedAt: 'updated',
			createdAt: 'created',
			ignoredPersistenceField: 'do not expose',
		})
		const user = { id: 42 }
		const req = { payload: { findGlobal }, user } as unknown as PayloadRequest

		await expect(findPublishedMcpGuideline(req, 'ko')).resolves.toEqual({
			id: 1,
			companyName: 'PROTO',
			documentTitle: 'Brand Guideline',
			issuedLabel: '2026',
			favicon: 3,
			primaryColor: 4,
			primaryColorDark: 5,
			_status: 'published',
			updatedAt: 'updated',
			createdAt: 'created',
		})
		expect(findGlobal).toHaveBeenCalledWith(
			expect.objectContaining({
				locale: 'ko',
				overrideAccess: false,
				req,
				user,
			}),
		)
	})
})
