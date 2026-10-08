import type { PayloadRequest } from 'payload'
import { expect, test, vi } from 'vitest'
import { findPublishedRules } from './rules.payload.repository'

const req = (user?: unknown): PayloadRequest => ({ payload: { find }, user }) as never
const find = vi.fn()

// 요청자가 있으면 access를 우회하지 않는다 — 우회하면 worker에게 초안 Rule이 보인다.
test('published Rule을 요청자 권한으로 읽는다', async () => {
	const user = { role: 'manager' }
	find.mockResolvedValue({ docs: [{ key: 'color.palette' }] })

	await expect(findPublishedRules(req(user))).resolves.toEqual([{ key: 'color.palette' }])
	expect(find).toHaveBeenCalledWith({
		collection: 'rules',
		depth: 0,
		draft: false,
		limit: 2000,
		overrideAccess: false,
		user,
		where: { _status: { equals: 'published' } },
	})
})

test('요청자가 없는 서버 호출만 access를 연다', async () => {
	find.mockResolvedValue({ docs: [] })
	await findPublishedRules(req())
	expect(find).toHaveBeenCalledWith(expect.objectContaining({ overrideAccess: true }))
})
