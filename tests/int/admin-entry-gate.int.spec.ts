import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * worker에게 Payload Admin은 존재하지 않아야 한다(2026-09-28 결정).
 * 권한의 1차 경계는 `Users.access.admin`이고, 여기서 보는 것은 **노출을 덮는 층**이다.
 */

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getPayload: vi.fn() }))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', async (importOriginal) => ({
	...(await importOriginal<object>()),
	getPayload: mocks.getPayload,
}))

const { config, proxy } = await import('@/proxy')

const request = (): never =>
	({ headers: new Headers(), url: 'http://localhost:3000/admin' }) as never

describe('/admin 입구', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.getPayload.mockResolvedValue({ auth: mocks.auth })
	})

	it.each([
		['worker', { id: 1, role: 'worker' }],
		['비로그인', null],
	])('%s에게는 404 화면을 돌려준다', async (_label, user) => {
		mocks.auth.mockResolvedValue({ user })

		const response = await proxy(request())

		expect(response?.headers.get('x-middleware-rewrite')).toContain('/admin-not-found')
	})

	it.each([
		['manager', { id: 2, role: 'manager' }],
		['admin', { id: 3, role: 'admin' }],
	])('%s는 그대로 통과시킨다', async (_label, user) => {
		mocks.auth.mockResolvedValue({ user })

		expect(await proxy(request())).toBeUndefined()
	})

	it('matcher가 /admin과 그 하위를 모두 덮는다', () => {
		expect(config.matcher).toEqual(['/admin', '/admin/:path*'])
	})
})
