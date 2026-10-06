import { afterEach, describe, expect, it, vi } from 'vitest'
import { runFullCheck } from '@/features/asset-check/services/submit-check.client'

function jsonResponse(body: unknown) {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' },
	})
}

const serverResult = {
	checkSessionId: 197,
	results: {},
	pendingCheckKeys: ['logo-misuse', 'color-misuse'],
	rulesetSnapshot: [],
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('runFullCheck', () => {
	it('AI 요청이 응답을 못 돌려주면 모델 실패와 구분되는 사유로 폴백한다', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: string) =>
				input === '/api/check'
					? jsonResponse(serverResult)
					: new Response(null, { status: 500 }),
			),
		)
		const onAiResult = vi.fn()

		await runFullCheck(new File([new Uint8Array([1])], 'poster.png'), 'poster', {
			onServerResult: () => {},
			onAiResult,
		})

		expect(onAiResult).toHaveBeenCalledTimes(1)
		const [checkSessionId, results] = onAiResult.mock.calls[0]
		expect(checkSessionId).toBe(197)
		expect(Object.keys(results)).toEqual(serverResult.pendingCheckKeys)
		for (const key of serverResult.pendingCheckKeys) {
			// 모델은 호출되지 않았으므로 서버의 ai_request_failed('AI 평가 실패')로 새면 안 된다.
			expect(results[key].rawResult.reasonCode).toBe('ai_request_unreachable')
			expect(results[key].rawResult.detail).toBe('AI 요청 전달 실패')
		}
	})

	it('토큰 한도로 막힌 AI 요청(429)은 전달 실패가 아니라 한도 초과로 채운다', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: string) =>
				input === '/api/check'
					? jsonResponse(serverResult)
					: new Response(null, { status: 429 }),
			),
		)
		const onAiResult = vi.fn()

		await runFullCheck(new File([new Uint8Array([1])], 'poster.png'), 'poster', {
			onServerResult: () => {},
			onAiResult,
		})

		const [, results] = onAiResult.mock.calls[0]
		for (const key of serverResult.pendingCheckKeys) {
			expect(results[key].rawResult.reasonCode).toBe('ai_token_limit')
			expect(results[key].rawResult.detail).toBe('AI 토큰 한도 초과')
		}
	})

	it('AI 요청이 성공하면 서버 판정을 그대로 전달한다', async () => {
		const aiResults = { 'logo-misuse': { rawResult: { status: 'pass' } } }
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: string) =>
				input === '/api/check'
					? jsonResponse(serverResult)
					: jsonResponse({ results: aiResults }),
			),
		)
		const onAiResult = vi.fn()

		await runFullCheck(new File([new Uint8Array([1])], 'poster.png'), 'poster', {
			onServerResult: () => {},
			onAiResult,
		})

		expect(onAiResult).toHaveBeenCalledWith(197, aiResults)
	})
})
