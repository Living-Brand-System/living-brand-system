import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FigmaApiError, FigmaImportError } from '@/lib/errors'

const mocks = vi.hoisted(() => ({
	authenticateRequest: vi.fn(),
	importFigmaHtml: vi.fn(),
	isCrossOriginRequest: vi.fn(),
	logger: { error: vi.fn() },
}))

vi.mock('@/lib/request-auth', () => ({
	authenticateRequest: mocks.authenticateRequest,
	isCrossOriginRequest: mocks.isCrossOriginRequest,
}))
vi.mock('@/features/template-import/services/import-figma-html.service', () => ({
	importFigmaHtml: mocks.importFigmaHtml,
}))

import { POST } from './route'

function importRequest() {
	return new Request('http://localhost/api/templates/import-figma-html', {
		body: JSON.stringify({
			sourceUrl: 'https://www.figma.com/design/file/Template?node-id=1-2',
		}),
		headers: { 'Content-Type': 'application/json' },
		method: 'POST',
	})
}

describe('POST /api/templates/import-figma-html', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.isCrossOriginRequest.mockReturnValue(false)
		mocks.authenticateRequest.mockResolvedValue({
			payload: { logger: mocks.logger },
			user: { email: 'manager@example.com', id: 1, role: 'manager' },
		})
	})

	it('Figma 429의 대기시간·파일 플랜·좌석 제한을 사용자에게 전달한다', async () => {
		mocks.importFigmaHtml.mockRejectedValue(
			new FigmaApiError('nodes', 429, 54, 'starter', 'low'),
		)

		const response = await POST(importRequest())

		expect(response.status).toBe(429)
		expect(response.headers.get('Retry-After')).toBe('54')
		expect(await response.json()).toEqual({
			message:
				'Figma 요청 한도에 도달했습니다. 54초 후 다시 시도하세요. 대상 파일 플랜: Starter. 해당 파일 플랜에서 Viewer/Collab 좌석 제한이 적용되고 있습니다.',
		})
	})

	it.each([
		[
			403,
			'Figma 토큰이 만료되었거나 이 파일에 접근할 권한이 없습니다. 내 계정에서 토큰을 다시 등록하거나 파일 권한을 확인하세요.',
		],
		[404, 'Figma 파일 또는 프레임을 찾을 수 없습니다. URL과 node-id를 확인하세요.'],
		[500, 'Figma 프레임을 읽는 중 일시적인 오류가 발생했습니다. 잠시 후 다시 시도하세요.'],
	])('Figma %i를 안전한 사용자 문구로 변환한다', async (status, message) => {
		mocks.importFigmaHtml.mockRejectedValue(new FigmaApiError('nodes', status))

		const response = await POST(importRequest())

		expect(response.status).toBe(status === 500 ? 502 : status)
		expect(await response.json()).toEqual({ message })
	})

	it('예상 가능한 import 실패는 내부 상세 대신 안전한 조치 문구를 반환한다', async () => {
		mocks.importFigmaHtml.mockRejectedValue(
			new FigmaImportError(
				'Figma image exceeds size limit (16000000 bytes)',
				'Figma 레이어 이미지가 가져오기 제한인 15MB를 초과했습니다.',
				413,
			),
		)

		const response = await POST(importRequest())

		expect(response.status).toBe(413)
		expect(await response.json()).toEqual({
			message: 'Figma 레이어 이미지가 가져오기 제한인 15MB를 초과했습니다.',
		})
	})
})
