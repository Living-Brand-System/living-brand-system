import { describe, expect, it, vi } from 'vitest'
import { Templates } from './Templates'

type BeforeChangeHook = (args: {
	data: Record<string, unknown>
	originalDoc?: Record<string, unknown>
	req: { payload: { find: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> } }
}) => Promise<unknown>

const hook = Templates.hooks?.beforeChange?.at(-1) as unknown as BeforeChangeHook

type AccessFunction = (args: { req: { user: unknown } }) => unknown

function collectionAccess(name: 'create' | 'delete' | 'read' | 'update'): AccessFunction {
	const rule = Templates.access?.[name]
	if (typeof rule !== 'function') throw new Error(`${name} access is not configured`)
	return rule as unknown as AccessFunction
}

function buildRequest() {
	return {
		req: {
			payload: {
				find: vi.fn().mockResolvedValue({ docs: [] }),
				update: vi.fn().mockResolvedValue({}),
			},
		},
	}
}

describe('Templates beforeChange hook', () => {
	it('저장 검증 blocker를 API 오류로 바꾼다', async () => {
		await expect(
			hook({ data: { name: 'no template', _status: 'published' }, ...buildRequest() }),
		).rejects.toThrow('발행할 HTML 템플릿이 필요합니다')
	})

	it('검증을 통과한 data를 그대로 반환한다', async () => {
		const data = {
			_status: 'draft',
			html: '<p data-node-id="name">이름</p>',
			overrides: {},
		}

		await expect(hook({ data, ...buildRequest() })).resolves.toBe(data)
	})
})

describe('Templates access', () => {
	it('공개·worker는 published만 읽고 manager는 draft도 읽는다', () => {
		for (const user of [null, { role: 'worker' }]) {
			expect(collectionAccess('read')({ req: { user } })).toEqual({
				_status: { equals: 'published' },
			})
		}
		expect(collectionAccess('read')({ req: { user: { role: 'manager' } } })).toBe(true)
	})

	it('쓰기는 manager/admin만 허용하고 baseHtml도 둘만 읽는다', () => {
		for (const operation of ['create', 'update', 'delete'] as const) {
			expect(collectionAccess(operation)({ req: { user: { role: 'worker' } } })).toBe(false)
			expect(collectionAccess(operation)({ req: { user: { role: 'manager' } } })).toBe(true)
		}

		for (const fieldName of ['baseHtml', 'sourceUrl']) {
			const field = Templates.fields.find(
				(candidate) => 'name' in candidate && candidate.name === fieldName,
			)
			if (!field || !('access' in field) || typeof field.access?.read !== 'function') {
				throw new Error(`${fieldName} read access is not configured`)
			}
			const read = field.access.read as unknown as AccessFunction
			expect(read({ req: { user: { role: 'worker' } } })).toBe(false)
			expect(read({ req: { user: { role: 'manager' } } })).toBe(true)
		}
	})
})
