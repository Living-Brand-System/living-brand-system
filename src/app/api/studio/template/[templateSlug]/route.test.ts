// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { GET } from './route'

const mocks = vi.hoisted(() => ({
	auth: vi.fn(),
	crossOrigin: vi.fn(),
	studio: vi.fn(),
	log: vi.fn(),
}))
vi.mock('@/lib/request-auth', () => ({
	authenticateRequest: mocks.auth,
	isCrossOriginRequest: mocks.crossOrigin,
}))
vi.mock('@/features/template-customization/services/get-template-studio.service', () => ({
	getTemplateStudio: mocks.studio,
}))
const request = () =>
	GET(new Request('http://localhost/api/studio/template/poster'), {
		params: Promise.resolve({ templateSlug: 'poster' }),
	})

beforeEach(() => {
	vi.clearAllMocks()
	mocks.crossOrigin.mockReturnValue(false)
	mocks.auth.mockResolvedValue({ user: { id: 1 }, payload: { logger: { error: mocks.log } } })
})

it('교차 출처와 미인증 요청은 서비스 실행 전에 차단한다', async () => {
	mocks.crossOrigin.mockReturnValueOnce(true)
	expect((await request()).status).toBe(403)
	expect(mocks.auth).not.toHaveBeenCalled()
	mocks.auth.mockResolvedValueOnce({ user: null, payload: {} })
	expect((await request()).status).toBe(401)
	expect(mocks.studio).not.toHaveBeenCalled()
})

it('인증한 사용자로 발행 계약을 조회하고 없는 템플릿은 404를 반환한다', async () => {
	mocks.studio.mockResolvedValueOnce({ config: { id: 1 } }).mockResolvedValueOnce(null)
	expect(await (await request()).json()).toEqual({ config: { id: 1 } })
	expect(mocks.studio).toHaveBeenCalledWith('poster', { id: 1 })
	expect((await request()).status).toBe(404)
})

it('내부 실패 내용은 응답에 노출하지 않는다', async () => {
	mocks.studio.mockRejectedValueOnce(new Error('internal detail'))
	const response = await request()
	expect(response.status).toBe(500)
	expect(await response.json()).toEqual({ message: 'Failed to load template.' })
	expect(mocks.log).toHaveBeenCalled()
})
