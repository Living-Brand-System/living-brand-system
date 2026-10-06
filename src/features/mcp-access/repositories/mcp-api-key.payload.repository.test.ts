import { getPayload } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import { createMcpApiKeyRecord, findMcpApiKeyIssuedAt } from './mcp-api-key.payload.repository'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))

describe('MCP API key repository', () => {
	it('새 키를 발급하고 사용자용 MCP 도구를 모두 활성화한다', async () => {
		const create = vi.fn().mockResolvedValue({ id: 7 })
		const del = vi.fn().mockResolvedValue({ docs: [] })
		vi.mocked(getPayload).mockResolvedValue({ create, delete: del } as never)
		const user = { email: 'worker@example.com', id: 1, role: 'worker' } as const

		const credential = await createMcpApiKeyRecord(user as never)
		expect(credential).toEqual({ apiKey: expect.stringMatching(/^[0-9a-f-]{36}$/), id: 7 })
		expect(create).toHaveBeenCalledWith({
			collection: 'payload-mcp-api-keys',
			data: {
				apiKey: credential.apiKey,
				enableAPIKey: true,
				label: 'Frontend MCP key',
				user: 1,
				'payload-mcp-tool': {
					findChecks: true,
					findGuideline: true,
					findGuidelineDocuments: true,
					findTemplates: true,
					generateBrandImage: true,
					listImageProfiles: true,
					runAssetCheck: true,
					searchGuidelines: true,
					submitAssetCheckObservations: true,
				},
			},
			depth: 0,
			overrideAccess: false,
			user,
		})
	})
})

describe('createMcpApiKeyRecord', () => {
	it('새 키를 만든 뒤 같은 계정의 다른 키만 지운다 — 재발급은 교체다', async () => {
		const calls: string[] = []
		const create = vi.fn(async () => {
			calls.push('create')
			return { id: 42 }
		})
		const del = vi.fn(async () => {
			calls.push('delete')
			return { docs: [] }
		})
		vi.mocked(getPayload).mockResolvedValue({ create, delete: del } as never)

		const credential = await createMcpApiKeyRecord({ id: 7 } as never)

		expect(credential.id).toBe(42)
		// 🔴 순서가 계약이다 — 지우기가 먼저면 실패 시 키가 0개가 된다.
		expect(calls).toEqual(['create', 'delete'])
		expect(del).toHaveBeenCalledWith(
			expect.objectContaining({
				collection: 'payload-mcp-api-keys',
				where: { and: [{ user: { equals: 7 } }, { id: { not_equals: 42 } }] },
			}),
		)
	})
})

describe('findMcpApiKeyIssuedAt', () => {
	it('가장 최근 키의 발급 시각을 돌려주고, 없으면 null이다', async () => {
		const find = vi
			.fn()
			.mockResolvedValueOnce({ docs: [{ createdAt: '2026-10-02T01:00:00.000Z' }] })
			.mockResolvedValueOnce({ docs: [] })
		vi.mocked(getPayload).mockResolvedValue({ find } as never)

		await expect(findMcpApiKeyIssuedAt({ id: 7 } as never)).resolves.toBe(
			'2026-10-02T01:00:00.000Z',
		)
		await expect(findMcpApiKeyIssuedAt({ id: 7 } as never)).resolves.toBeNull()
		expect(find).toHaveBeenCalledWith(
			expect.objectContaining({ sort: '-createdAt', where: { user: { equals: 7 } } }),
		)
	})
})
