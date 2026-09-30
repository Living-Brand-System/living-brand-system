import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	authenticateRequest: vi.fn(),
	isCrossOriginRequest: vi.fn(),
	registerFigmaToken: vi.fn(),
	removeFigmaToken: vi.fn(),
	logger: { error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/lib/request-auth', () => ({
	authenticateRequest: mocks.authenticateRequest,
	isCrossOriginRequest: mocks.isCrossOriginRequest,
}))
vi.mock('@/features/template-import/services/figma-token.service', () => ({
	registerFigmaToken: mocks.registerFigmaToken,
	removeFigmaToken: mocks.removeFigmaToken,
}))

import { DELETE, PUT } from './route'

const manager = { email: 'manager@example.com', id: 3, role: 'manager' }
const put = (body: unknown) =>
	PUT(
		new Request('https://lbs.example/api/figma-token', {
			body: JSON.stringify(body),
			method: 'PUT',
		}),
	)

describe('/api/figma-token', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.isCrossOriginRequest.mockReturnValue(false)
		mocks.authenticateRequest.mockResolvedValue({
			payload: { logger: mocks.logger },
			user: manager,
		})
	})

	it('manager의 토큰을 본인 계정에 등록하고 원문을 응답·로그에 싣지 않는다', async () => {
		const response = await put({ token: '  figd_secret  ' })

		expect(response.status).toBe(204)
		expect(await response.text()).toBe('')
		expect(mocks.registerFigmaToken).toHaveBeenCalledWith(
			expect.anything(),
			manager,
			'figd_secret',
		)
		expect(JSON.stringify(mocks.logger.info.mock.calls)).not.toContain('figd_secret')
	})

	it('빈 토큰은 거부한다', async () => {
		const response = await put({ token: '   ' })

		expect(response.status).toBe(400)
		expect(mocks.registerFigmaToken).not.toHaveBeenCalled()
	})

	it('worker는 등록할 수 없다(가져오기를 쓰지 않는다)', async () => {
		mocks.authenticateRequest.mockResolvedValue({
			payload: { logger: mocks.logger },
			user: { email: 'worker@example.com', id: 4, role: 'worker' },
		})

		expect((await put({ token: 'figd_secret' })).status).toBe(403)
		expect(mocks.registerFigmaToken).not.toHaveBeenCalled()
	})

	it('삭제는 본인 토큰만 지운다', async () => {
		const response = await DELETE(
			new Request('https://lbs.example/api/figma-token', { method: 'DELETE' }),
		)

		expect(response.status).toBe(204)
		expect(mocks.removeFigmaToken).toHaveBeenCalledWith(expect.anything(), manager)
	})
})
