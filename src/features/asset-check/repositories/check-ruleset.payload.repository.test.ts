import { getPayload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCheckSourceDocuments } from './check-ruleset.payload.repository'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))

describe('getCheckSourceDocuments', () => {
	beforeEach(() => {
		vi.mocked(getPayload).mockReset()
	})

	it('published 통합 문서를 rules 관계가 populate되는 depth로 한 번 조회한다', async () => {
		const find = vi.fn((_query: unknown) =>
			Promise.resolve({
				docs: [
					{
						id: 1,
						title: 'Brand',
						slug: 'brand',
						displayOrder: 1,
						chapter: null,
						blocks: [],
						rules: [],
					},
				],
			}),
		)
		vi.mocked(getPayload).mockResolvedValue({ find } as never)

		const result = await getCheckSourceDocuments()

		expect(result.documents).toEqual([
			{
				id: 1,
				title: 'Brand',
				slug: 'brand',
				displayOrder: 1,
				chapter: null,
				checks: [],
			},
		])
		expect(find).toHaveBeenCalledWith(
			expect.objectContaining({
				collection: 'guideline-documents',
				depth: 2,
				draft: false,
			}),
		)
		expect(find.mock.calls[0]?.[0]).not.toHaveProperty('where')
		expect(find).toHaveBeenCalledTimes(1)
	})

	it('Payload 관계와 Block Rule을 실행 가능한 Check source로 수집한다', async () => {
		const checker = {
			id: 9,
			name: 'Layout checker',
			key: 'logo-layout',
			executor: 'deterministic',
			checkerKey: 'clear-space',
			model: null,
			prompt: '  inspect layout  ',
			updatedAt: '2026-07-17',
			createdAt: '2026-07-17',
		}
		const find = vi.fn(() =>
			Promise.resolve({
				docs: [
					{
						id: 30,
						title: 'Primary Logo',
						slug: 'primary-logo',
						displayOrder: 3,
						chapter: null,
						rules: [],
						blocks: [
							{
								id: 'logo-examples',
								blockName: 'Logo examples',
								blockType: 'section',
								anchor: 'logo-examples',
								title: 'Logo examples',
								children: [],
								rules: [
									{
										id: 91,
										key: 'logo.clear-space',
										title: 'Clear Space',
										titleKo: '보호 공간',
										tier: 'required',
										executor: 'deterministic',
										checker,
										options: { criteria: [] },
										criteria: [],
										messages: { pass: '통과' },
									},
								],
							},
						],
					},
				],
			}),
		)
		vi.mocked(getPayload).mockResolvedValue({ find } as never)

		const { documents } = await getCheckSourceDocuments()

		expect(documents[0]).toMatchObject({
			id: 30,
			checks: [
				{
					rule: {
						key: 'logo.clear-space',
						titleKo: '보호 공간',
						checker: {
							key: 'logo-layout',
							executor: 'deterministic',
							checkerKey: 'clear-space',
							prompt: '  inspect layout  ',
						},
						messages: { pass: '통과' },
					},
					source: { documentId: 30 },
					evidence: { type: 'section', anchor: 'logo-examples', title: 'Logo examples' },
					referenceAssets: [],
				},
			],
		})
	})

	it('손상된 breadcrumb 관계도 위치를 당기지 않고 sentinel로 보존한다', async () => {
		const find = vi.fn().mockResolvedValue({
			docs: [
				{
					id: 30,
					title: 'Primary Logo',
					slug: 'primary-logo',
					displayOrder: 3,
					chapter: { title: 'Brand', slug: 'brand', displayOrder: 2 },
					checks: [],
					blocks: [],
				},
			],
		})
		vi.mocked(getPayload).mockResolvedValue({ find } as never)

		const { documents } = await getCheckSourceDocuments()

		expect(documents[0]?.chapter).toEqual({ title: 'Brand', slug: 'brand', displayOrder: 2 })
	})
})
