import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CheckResult } from '@/features/asset-check/checkers/types'
import {
	CheckSession,
	CheckSessionInputMismatchError,
	CheckSessionNotFoundError,
	type CheckSessionSnapshot,
} from '@/features/asset-check/domain/check-session'
import type { RuntimeCheck } from '@/features/asset-check/domain/runtime-check'
import {
	findUnavailableAiReferenceCheckKeys,
	loadAiReferenceFiles,
} from '@/features/asset-check/repositories/ai-check.ai.repository'
import {
	completeRunningCheckSessionRecord,
	createCheckSessionRecord,
	getCheckSessionRecord,
	saveCheckSessionRecord,
} from '@/features/asset-check/repositories/check-session.payload.repository'
import { getRuntimeChecks } from '@/features/asset-check/services/get-check-ruleset.service'
import {
	runHeuristicCheck,
	runImmediateCheck,
} from '@/features/asset-check/services/run-check.service'
import type { User } from '@/payload-types'
import {
	completeCheckSessionAiCheck,
	completeCheckSessionObservations,
	startCheckSession,
} from './start-check-session.service'

// 한도 판정은 이 테스트의 대상이 아니다 — Payload 설정·DB를 끌어오지 않게 막아 둔다.
vi.mock('@/modules/ai-usage/services/token-limit.service', () => ({
	assertWithinTokenLimit: vi.fn(async () => {}),
	TokenLimitExceededError: class TokenLimitExceededError extends Error {},
}))

vi.mock('@/features/asset-check/repositories/check-session.payload.repository', () => ({
	completeRunningCheckSessionRecord: vi.fn(),
	createCheckSessionRecord: vi.fn(),
	getCheckSessionRecord: vi.fn(),
	saveCheckSessionRecord: vi.fn(),
}))
vi.mock('@/features/asset-check/repositories/ai-check.ai.repository', () => ({
	findUnavailableAiReferenceCheckKeys: vi.fn(),
	loadAiReferenceFiles: vi.fn(),
}))
vi.mock('@/features/asset-check/services/get-check-ruleset.service', () => ({
	getRuntimeChecks: vi.fn(),
}))
vi.mock('@/features/asset-check/services/run-check.service', () => ({
	runHeuristicCheck: vi.fn(),
	runImmediateCheck: vi.fn(),
}))

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const otherPng = Buffer.concat([png, Buffer.from([0x00])])
const user = { id: 7 } as User
const scenario = { key: 'quick', title: '빠른 검수', checkKeys: [] }
const immediateResult = {
	rule: { key: 'canvas-format', title: 'Canvas format', executor: 'deterministic' },
	checker: { key: 'canvas-format', type: 'algorithm' },
	rawResult: { status: 'pass', fulfillment: 100 },
} as unknown as CheckResult
const heuristicCheck: RuntimeCheck = {
	key: 'heuristic',
	title: 'Logo present',
	checker: { key: 'ai-check', type: 'heuristic' },
	executor: 'heuristic',
	heuristicCriteria: [
		{
			id: 'logo-visible',
			question: 'Is the logo visible?',
			expected: 'present',
		},
	],
	implemented: true,
	evidence: '',
	referenceAssets: [],
}

function snapshot(
	buffer: Buffer | null,
	status: CheckSessionSnapshot['status'] = 'running',
): CheckSessionSnapshot {
	return {
		id: 41,
		status,
		results: {},
		pendingCheckKeys: ['heuristic'],
		...(buffer
			? {
					inputSnapshot: {
						sha256: createHash('sha256').update(buffer).digest('hex'),
						mediaType: 'image/png' as const,
						byteLength: buffer.byteLength,
					},
				}
			: {}),
	}
}

describe('check session service', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(getRuntimeChecks).mockResolvedValue([])
		vi.mocked(runImmediateCheck).mockResolvedValue({ results: {}, pendingCheckKeys: [] })
		vi.mocked(runHeuristicCheck).mockResolvedValue({ results: {} })
		vi.mocked(completeRunningCheckSessionRecord).mockResolvedValue(true)
		vi.mocked(loadAiReferenceFiles).mockResolvedValue(new Map())
		vi.mocked(findUnavailableAiReferenceCheckKeys).mockReturnValue([])
		vi.mocked(createCheckSessionRecord).mockImplementation(async () =>
			CheckSession.restore(snapshot(png, 'running')),
		)
	})

	it('세션 시작 시 실제 바이트의 SHA-256·형식·크기를 저장한다', async () => {
		await startCheckSession({
			buffer: png,
			deferHeuristic: 'when-showable',
			scenario,
			source: 'review-page',
			user,
		})

		expect(createCheckSessionRecord).toHaveBeenCalledWith(
			expect.objectContaining({
				inputSnapshot: {
					sha256: createHash('sha256').update(png).digest('hex'),
					mediaType: 'image/png',
					byteLength: png.byteLength,
				},
			}),
		)
	})

	it("'when-showable'은 즉시 판정이 0건이면 나누지 않고 같은 요청에서 AI까지 끝낸다", async () => {
		// 즉시 판정이 없으면 후속 요청으로 미뤄도 화면에 먼저 보여줄 것이 없다 — 대신 원본을
		// 한 번 더 업로드하게 되므로 나누지 않는다.
		vi.mocked(runImmediateCheck).mockResolvedValue({
			results: {},
			pendingCheckKeys: ['logo-misuse'],
		})
		vi.mocked(runHeuristicCheck).mockResolvedValue({
			results: { 'logo-misuse': immediateResult },
		})

		const result = await startCheckSession({
			buffer: png,
			deferHeuristic: 'when-showable',
			scenario,
			source: 'review-page',
			user,
		})

		expect(runHeuristicCheck).toHaveBeenCalledTimes(1)
		// pending이 비어 돌아가므로 클라이언트는 두 번째 요청(원본 재업로드)을 보내지 않는다.
		expect(result.pendingCheckKeys).toEqual([])
		expect(Object.keys(result.results)).toEqual(['logo-misuse'])
	})

	it("'when-showable'은 즉시 판정이 있으면 후속 요청으로 미룬다", async () => {
		vi.mocked(runImmediateCheck).mockResolvedValue({
			results: { 'canvas-format': immediateResult },
			pendingCheckKeys: ['logo-misuse'],
		})

		const result = await startCheckSession({
			buffer: png,
			deferHeuristic: 'when-showable',
			scenario,
			source: 'review-page',
			user,
		})

		expect(runHeuristicCheck).not.toHaveBeenCalled()
		expect(result.pendingCheckKeys).toEqual(['logo-misuse'])
	})

	it("'always'는 즉시 판정이 0건이어도 서버 AI를 부르지 않는다", async () => {
		// 🔴 MCP 계약 — 관측은 연결된 클라이언트 AI가 하고 서버는 LBS의 AI 키를 쓰지 않는다.
		vi.mocked(runImmediateCheck).mockResolvedValue({
			results: {},
			pendingCheckKeys: ['logo-misuse'],
		})

		const result = await startCheckSession({
			buffer: png,
			deferHeuristic: 'always',
			scenario,
			source: 'mcp-call',
			user,
		})

		expect(runHeuristicCheck).not.toHaveBeenCalled()
		expect(result.pendingCheckKeys).toEqual(['logo-misuse'])
	})

	it('시작 검수의 완료 상태 저장이 실패하면 DB의 running 세션을 failed로 종결한다', async () => {
		const saveError = new Error('Completed update failed.')
		const persistedSession = CheckSession.restore(snapshot(png, 'running'))
		vi.mocked(getCheckSessionRecord).mockResolvedValueOnce(persistedSession)
		vi.mocked(saveCheckSessionRecord)
			.mockRejectedValueOnce(saveError)
			.mockResolvedValueOnce(undefined)

		await expect(
			startCheckSession({
				buffer: png,
				scenario,
				source: 'review-page',
				user,
			}),
		).rejects.toBe(saveError)
		expect(persistedSession.status).toBe('failed')
		expect(saveCheckSessionRecord).toHaveBeenNthCalledWith(2, persistedSession, user)
	})

	it('소유자 조회에서 찾지 못한 세션은 not found로 종료한다', async () => {
		vi.mocked(getCheckSessionRecord).mockResolvedValue(null)

		await expect(
			completeCheckSessionAiCheck({ buffer: png, checkSessionId: 41, user }),
		).rejects.toThrow(CheckSessionNotFoundError)
		expect(runHeuristicCheck).not.toHaveBeenCalled()
	})

	it('완료된 세션도 다른 입력이면 저장 결과보다 먼저 거부한다', async () => {
		vi.mocked(getCheckSessionRecord).mockResolvedValue(
			CheckSession.restore(snapshot(png, 'completed')),
		)

		await expect(
			completeCheckSessionAiCheck({ buffer: otherPng, checkSessionId: 41, user }),
		).rejects.toThrow(CheckSessionInputMismatchError)
		expect(runHeuristicCheck).not.toHaveBeenCalled()
		expect(saveCheckSessionRecord).not.toHaveBeenCalled()
	})

	it('입력 지문이 없는 과거 세션은 멱등 완료로 오인하지 않는다', async () => {
		vi.mocked(getCheckSessionRecord).mockResolvedValue(
			CheckSession.restore(snapshot(null, 'completed')),
		)

		await expect(
			completeCheckSessionAiCheck({ buffer: png, checkSessionId: 41, user }),
		).rejects.toThrow(CheckSessionInputMismatchError)
	})

	it('같은 입력의 완료 세션만 저장된 결과를 멱등 반환한다', async () => {
		vi.mocked(getCheckSessionRecord).mockResolvedValue(
			CheckSession.restore(snapshot(png, 'completed')),
		)

		await expect(
			completeCheckSessionAiCheck({ buffer: png, checkSessionId: 41, user }),
		).resolves.toEqual({ checkSessionId: 41, results: {} })
		expect(runHeuristicCheck).not.toHaveBeenCalled()
	})

	it('MCP 클라이언트 관측값은 서버 evaluator로 판정해 완료한다', async () => {
		const session = CheckSession.restore({
			...snapshot(png),
			rulesetSnapshot: [heuristicCheck],
		})
		vi.mocked(getCheckSessionRecord).mockResolvedValue(session)

		await expect(
			completeCheckSessionObservations({
				checkSessionId: 41,
				observations: {
					heuristic: {
						'logo-visible': {
							value: 'present',
							confidence: 95,
							reason: '로고가 보입니다.',
						},
					},
				},
				user,
			}),
		).resolves.toMatchObject({
			checkSessionId: 41,
			results: {
				heuristic: {
					checker: { key: 'mcp-client', type: 'ai' },
					rawResult: { status: 'pass', fulfillment: 100 },
				},
			},
		})
		expect(session.status).toBe('completed')
		expect(runHeuristicCheck).not.toHaveBeenCalled()
		expect(completeRunningCheckSessionRecord).toHaveBeenCalledWith(session, user)
		expect(saveCheckSessionRecord).not.toHaveBeenCalled()
	})

	it('동시 MCP 제출은 먼저 저장된 완료 결과를 멱등 반환한다', async () => {
		const losingSession = CheckSession.restore({
			...snapshot(png),
			rulesetSnapshot: [heuristicCheck],
		})
		const winningSession = CheckSession.restore({
			...snapshot(png, 'completed'),
			results: {
				heuristic: {
					rule: { key: 'heuristic', title: 'Logo present', executor: 'heuristic' },
					checker: { key: 'mcp-client', type: 'ai' },
					rawResult: { status: 'fail', fulfillment: 0 },
				},
			},
			pendingCheckKeys: [],
		})
		vi.mocked(getCheckSessionRecord)
			.mockResolvedValueOnce(losingSession)
			.mockResolvedValueOnce(winningSession)
		vi.mocked(completeRunningCheckSessionRecord).mockResolvedValue(false)

		await expect(
			completeCheckSessionObservations({
				checkSessionId: 41,
				observations: {
					heuristic: {
						'logo-visible': {
							value: 'present',
							confidence: 95,
							reason: '로고가 보입니다.',
						},
					},
				},
				user,
			}),
		).resolves.toEqual({
			checkSessionId: 41,
			results: winningSession.results,
		})
		expect(completeRunningCheckSessionRecord).toHaveBeenCalledTimes(1)
		expect(saveCheckSessionRecord).not.toHaveBeenCalled()
	})

	it('레퍼런스 로딩 실패 Check는 클라이언트 관측과 무관하게 needs_review로 저장한다', async () => {
		const referenceCheck: RuntimeCheck = {
			...heuristicCheck,
			referenceAssets: [
				{
					name: 'logo-master.png',
					url: '/logo-master.png',
					mimeType: 'image/png',
					role: 'positive',
				},
			],
		}
		const session = CheckSession.restore({
			...snapshot(png),
			rulesetSnapshot: [referenceCheck],
		})
		vi.mocked(getCheckSessionRecord).mockResolvedValue(session)
		vi.mocked(findUnavailableAiReferenceCheckKeys).mockReturnValue(['heuristic'])

		await expect(
			completeCheckSessionObservations({
				checkSessionId: 41,
				observations: {
					heuristic: {
						'logo-visible': {
							value: 'present',
							confidence: 95,
							reason: '로고가 보입니다.',
						},
					},
				},
				user,
			}),
		).resolves.toMatchObject({
			results: {
				heuristic: {
					rawResult: {
						status: 'needs_review',
						reasonCode: 'reference_asset_unavailable',
					},
				},
			},
		})
		expect(loadAiReferenceFiles).toHaveBeenCalledWith([referenceCheck])
	})

	it('저장된 룰셋과 다른 MCP 관측 키는 판정·저장하지 않는다', async () => {
		const session = CheckSession.restore({
			...snapshot(png),
			rulesetSnapshot: [heuristicCheck],
		})
		vi.mocked(getCheckSessionRecord).mockResolvedValue(session)

		await expect(
			completeCheckSessionObservations({
				checkSessionId: 41,
				observations: {
					heuristic: {
						'unexpected-criterion': {
							value: 'present',
							confidence: 95,
							reason: '로고가 보입니다.',
						},
					},
				},
				user,
			}),
		).rejects.toThrow('Client check submission keys do not match')
		await expect(
			completeCheckSessionObservations({
				checkSessionId: 41,
				observations: {
					heuristic: {
						'logo-visible': {
							value: 1,
							confidence: 95,
							reason: '잘못된 관측 형식입니다.',
						},
					},
				},
				user,
			}),
		).rejects.toThrow('Client check observation does not match criterion logo-visible')
		expect(session.status).toBe('running')
		expect(saveCheckSessionRecord).not.toHaveBeenCalled()
	})

	it('AI 판정 실패를 failed로 저장하고 원 오류를 다시 던진다', async () => {
		const error = new Error('Provider failed.')
		const session = CheckSession.restore(snapshot(png, 'running'))
		vi.mocked(getCheckSessionRecord).mockResolvedValue(session)
		vi.mocked(runHeuristicCheck).mockRejectedValue(error)

		await expect(
			completeCheckSessionAiCheck({ buffer: png, checkSessionId: 41, user }),
		).rejects.toBe(error)
		expect(session.status).toBe('failed')
		expect(saveCheckSessionRecord).toHaveBeenCalledWith(session, user)
		expect(session.toUpdateData()).toEqual(
			expect.objectContaining({ status: 'failed', errorMessage: 'Provider failed.' }),
		)
	})

	it('실패 상태 저장까지 실패하면 저장 오류를 원 오류의 cause로 남긴다', async () => {
		const error = new Error('Provider failed.')
		const saveError = new Error('Database failed.')
		vi.mocked(getCheckSessionRecord).mockResolvedValue(
			CheckSession.restore(snapshot(png, 'running')),
		)
		vi.mocked(runHeuristicCheck).mockRejectedValue(error)
		vi.mocked(saveCheckSessionRecord).mockRejectedValue(saveError)

		await expect(
			completeCheckSessionAiCheck({ buffer: png, checkSessionId: 41, user }),
		).rejects.toBe(error)
		expect(error.cause).toBe(saveError)
	})

	it('완료 상태 저장이 실패하면 DB의 running 세션을 다시 읽어 failed로 종결한다', async () => {
		const saveError = new Error('Completed update failed.')
		const inMemorySession = CheckSession.restore(snapshot(png, 'running'))
		const persistedSession = CheckSession.restore(snapshot(png, 'running'))
		vi.mocked(getCheckSessionRecord)
			.mockResolvedValueOnce(inMemorySession)
			.mockResolvedValueOnce(persistedSession)
		vi.mocked(runHeuristicCheck).mockResolvedValue({
			results: {
				heuristic: {
					rule: { key: 'heuristic', title: 'Heuristic', executor: 'heuristic' },
					checker: { key: 'ai-check', type: 'ai' },
					rawResult: { status: 'pass', fulfillment: 100 },
				},
			},
		})
		vi.mocked(saveCheckSessionRecord)
			.mockRejectedValueOnce(saveError)
			.mockResolvedValueOnce(undefined)

		await expect(
			completeCheckSessionAiCheck({ buffer: png, checkSessionId: 41, user }),
		).rejects.toBe(saveError)
		expect(persistedSession.status).toBe('failed')
		expect(saveCheckSessionRecord).toHaveBeenNthCalledWith(2, persistedSession, user)
	})
})
