import { generateText, Output } from 'ai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type AiCheckPlan, planChecks } from '@/features/asset-check/domain/check-plan'
import {
	measureObservationSchema,
	presenceObservationSchema,
} from '@/features/asset-check/domain/heuristic.evaluator'
import type { RuntimeCheck } from '@/features/asset-check/domain/runtime-check'

vi.mock('ai', () => ({
	generateText: vi.fn(),
	NoObjectGeneratedError: { isInstance: vi.fn(() => false) },
	Output: {
		object: vi.fn((value) => value),
	},
	extractJsonMiddleware: vi.fn((options) => options),
	wrapLanguageModel: vi.fn(({ model }) => model),
}))

vi.mock('@ai-sdk/anthropic', () => ({
	anthropic: vi.fn((model: string) => ({ model })),
}))

const checks: RuntimeCheck[] = [
	{
		key: 'imagery.mood',
		title: 'Imagery mood',
		titleKo: '이미지 무드',
		source: { documentId: 12 },
		checker: { key: 'asset-check.brand-guideline', type: 'heuristic' },
		executor: 'heuristic',
		model: 'rule-spec-model',
		prompt: '브랜드 사진의 자연광 기준을 우선 적용한다.',
		heuristicPrompt: '인물의 표정이 자연스럽고 과장되지 않았는지 우선 판단한다.',
		heuristicCriteria: [
			{
				id: 'natural-expression',
				question: '인물의 표정이 자연스러운가?',
				expected: 'present',
			},
		],
		implemented: true,
		evidence: {
			type: 'section',
			anchor: 'lifestyle',
			title: 'Lifestyle',
			description: '자연스러운 일상의 순간',
		},
		referenceAssets: [],
		messages: {},
	},
]

const advisoryCheck: RuntimeCheck = {
	key: 'imagery.advice',
	title: 'Imagery advice',
	titleKo: '이미지 디자인 조언',
	source: { documentId: 12 },
	checker: { key: 'design-advisor', type: 'manual' },
	executor: 'manual',
	model: 'rule-spec-model',
	prompt: '사진 무드 관점에서 디자이너처럼 개선 조언을 작성한다.',
	implemented: true,
	evidence: '자연스러운 일상의 순간',
	referenceAssets: [],
	messages: {},
}

// 테스트 입력을 실제 plan 분류기로 만들어 runAiCheck의 새 계약(plan + model)을 그대로 따른다.
const toAiPlans = (checks: RuntimeCheck[]) =>
	planChecks(checks).filter(
		(plan): plan is AiCheckPlan => plan.kind === 'ai-criteria' || plan.kind === 'ai-advisory',
	)

describe('runAiCheck', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
		vi.stubEnv('DATABASE_URL', 'postgres://user:pass@localhost:5432/test')
		vi.stubEnv('PAYLOAD_SECRET', 'test-secret')
		vi.mocked(generateText).mockReset()
	})
	afterEach(() => vi.unstubAllGlobals())

	it('maps AI SDK token usage for cost analysis', async () => {
		vi.mocked(generateText).mockResolvedValue({
			output: {
				results: {
					'imagery.mood': {
						observations: {
							'natural-expression': {
								value: 'present',
								confidence: 80,
								reason: '자연스러운 표정이 관측됩니다.',
							},
						},
					},
				},
			},
			usage: {
				inputTokens: 100,
				inputTokenDetails: {
					noCacheTokens: 85,
					cacheReadTokens: 10,
					cacheWriteTokens: 5,
				},
				outputTokens: 20,
				outputTokenDetails: {
					textTokens: 20,
					reasoningTokens: 0,
				},
				totalTokens: 120,
				raw: { providerUsage: true },
			},
		} as unknown as Awaited<ReturnType<typeof generateText>>)

		const { runAiCheck } = await import(
			'@/features/asset-check/repositories/ai-check.ai.repository'
		)
		const result = await runAiCheck(toAiPlans(checks), 'rule-spec-model', {
			image: { data: Buffer.from('png'), mediaType: 'image/png' },
			pixels: [],
			palette: [],
		})

		expect(result.aiUsage).toEqual({
			model: 'rule-spec-model',
			callCount: 1,
			inputTokens: 100,
			outputTokens: 20,
			totalTokens: 120,
			cacheReadInputTokens: 10,
			cacheWriteInputTokens: 5,
			reasoningTokens: 0,
			rawUsage: { providerUsage: true },
		})
		expect(result.observations).toEqual({
			'imagery.mood': {
				'natural-expression': {
					value: 'present',
					confidence: 80,
					reason: '자연스러운 표정이 관측됩니다.',
				},
			},
		})
		expect(generateText).toHaveBeenCalledTimes(1)
		expect(vi.mocked(generateText).mock.calls[0]?.[0]).not.toHaveProperty('temperature')
		const request = vi.mocked(generateText).mock.calls[0]?.[0] as {
			system?: string
			providerOptions?: Record<string, unknown>
			messages?: Array<{ content?: Array<{ text?: string; type?: string }> }>
		}
		// 🔴 outputFormat으로 돌아가면 응답이 같아도 출력 토큰이 간헐적으로 2배가 되고 지연도 2배다.
		expect(request.providerOptions).toEqual({
			anthropic: { structuredOutputMode: 'jsonTool' },
		})
		const content = request.messages?.[0]?.content ?? []
		const jsonText = content.find((part) => part.text?.startsWith('{"checks":'))?.text
		expect(JSON.parse(jsonText ?? '')).toEqual({
			checks: [
				{
					key: 'imagery.mood',
					kind: 'criteria',
					titleEn: 'Imagery mood',
					titleKo: '이미지 무드',
					source: { documentId: 12 },
					evidence: {
						type: 'section',
						anchor: 'lifestyle',
						title: 'Lifestyle',
						description: '자연스러운 일상의 순간',
					},
					heuristicPrompt: '인물의 표정이 자연스럽고 과장되지 않았는지 우선 판단한다.',
					checkerPrompt: '브랜드 사진의 자연광 기준을 우선 적용한다.',
					criteria: [
						{
							id: 'natural-expression',
							question: '인물의 표정이 자연스러운가?',
							kind: 'presence',
						},
					],
					referenceAssets: [],
				},
			],
		})
		expect(jsonText).not.toContain('expected')
		expect(request.system).toContain('untrusted source data')
		expect(content.some((part) => part.type === 'file')).toBe(true)

		const schema = (
			vi.mocked(Output.object).mock.calls[0]?.[0] as {
				schema: { safeParse: (value: unknown) => { success: boolean } }
			}
		).schema
		expect(schema.safeParse({ results: {} }).success).toBe(false)
		expect(
			schema.safeParse({
				results: {
					'imagery.mood': {
						observations: {
							'natural-expression': {
								value: 'present',
								confidence: 80,
								reason: '자연스러운 표정이 관측됩니다.',
							},
						},
					},
				},
			}).success,
		).toBe(true)
	})

	it('AI 요청 실패는 판정 대신 구조화된 실패 사유를 반환한다', async () => {
		vi.mocked(generateText).mockRejectedValue(new Error('provider unavailable'))
		const { runAiCheck } = await import(
			'@/features/asset-check/repositories/ai-check.ai.repository'
		)

		const result = await runAiCheck(toAiPlans(checks), 'rule-spec-model', {
			image: { data: Buffer.from('png'), mediaType: 'image/png' },
			pixels: [],
			palette: [],
		})

		expect(result).toEqual({
			observations: {},
			advices: {},
			failure: { detail: 'AI 평가 실패', reasonCode: 'ai_request_failed' },
		})
	})

	it('레퍼런스 fetch 실패 Check만 격리하고 실패 사유를 반환한다', async () => {
		const referenceCheck: RuntimeCheck = {
			...checks[0],
			referenceAssets: [
				{
					name: 'unavailable.png',
					url: '/api/assets/unavailable.png',
					mimeType: 'image/png',
					role: 'positive',
				},
			],
		}
		const independentCheck: RuntimeCheck = {
			...checks[0],
			key: 'imagery.independent',
		}
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('reference unavailable')))
		vi.mocked(generateText).mockResolvedValue({
			output: {
				results: {
					'imagery.independent': {
						observations: {
							'natural-expression': {
								value: 'present',
								confidence: 80,
								reason: '자연스러운 표정이 관측됩니다.',
							},
						},
					},
				},
			},
			usage: {
				inputTokens: 10,
				inputTokenDetails: { noCacheTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 },
				outputTokens: 5,
				outputTokenDetails: { textTokens: 5, reasoningTokens: 0 },
				totalTokens: 15,
				raw: {},
			},
		} as unknown as Awaited<ReturnType<typeof generateText>>)
		const { runAiCheck } = await import(
			'@/features/asset-check/repositories/ai-check.ai.repository'
		)

		const result = await runAiCheck(
			toAiPlans([referenceCheck, independentCheck]),
			'rule-spec-model',
			{
				image: { data: Buffer.from('png'), mediaType: 'image/png' },
				pixels: [],
				palette: [],
			},
		)

		expect(result.unavailableReferenceCheckKeys).toEqual(['imagery.mood'])
		expect(result.observations).toHaveProperty('imagery.independent')
		expect(result.observations).not.toHaveProperty('imagery.mood')
		const request = vi.mocked(generateText).mock.calls[0]?.[0] as {
			messages?: Array<{ content?: Array<{ text?: string }> }>
		}
		const jsonText = request.messages?.[0]?.content?.find((part) =>
			part.text?.startsWith('{"checks":'),
		)?.text
		expect(JSON.parse(jsonText ?? '{}').checks.map(({ key }: { key: string }) => key)).toEqual([
			'imagery.independent',
		])
	})

	it('checker prompt를 관찰 컨텍스트로 메시지에 삽입한다', async () => {
		vi.mocked(generateText).mockResolvedValue({
			output: { results: {} },
			usage: undefined,
		} as unknown as Awaited<ReturnType<typeof generateText>>)
		const { runAiCheck } = await import(
			'@/features/asset-check/repositories/ai-check.ai.repository'
		)

		await runAiCheck(toAiPlans(checks), 'rule-spec-model', {
			image: { data: new Uint8Array([1]), mediaType: 'image/png' },
		} as never)

		const call = vi.mocked(generateText).mock.calls[0]?.[0] as {
			messages: { content: { type: string; text?: string }[] }[]
		}
		const content = call.messages[0]?.content ?? []
		const jsonText = content.find((part) => part.text?.startsWith('{"checks":'))?.text
		expect(JSON.parse(jsonText ?? '').checks[0].checkerPrompt).toBe(
			'브랜드 사진의 자연광 기준을 우선 적용한다.',
		)
		expect(content[0]?.text).toContain(
			'Apply heuristicPrompt and checkerPrompt as additional observation context',
		)
	})

	it('advisory 체크는 advice 스키마로 조언 문단을 수집한다', async () => {
		vi.mocked(generateText).mockResolvedValue({
			output: {
				results: {
					'imagery.mood': {
						observations: {
							'natural-expression': {
								value: 'present',
								confidence: 80,
								reason: '자연스러운 표정이 관측됩니다.',
							},
						},
					},
					'imagery.advice': { advice: '자연광을 더 살리면 무드가 개선됩니다.' },
				},
			},
			usage: {
				inputTokens: 100,
				inputTokenDetails: { noCacheTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0 },
				outputTokens: 20,
				outputTokenDetails: { textTokens: 20, reasoningTokens: 0 },
				totalTokens: 120,
				raw: {},
			},
		} as unknown as Awaited<ReturnType<typeof generateText>>)

		const { runAiCheck } = await import(
			'@/features/asset-check/repositories/ai-check.ai.repository'
		)
		const result = await runAiCheck(toAiPlans([...checks, advisoryCheck]), 'rule-spec-model', {
			image: { data: Buffer.from('png'), mediaType: 'image/png' },
			pixels: [],
			palette: [],
		})

		expect(result.advices).toEqual({
			'imagery.advice': '자연광을 더 살리면 무드가 개선됩니다.',
		})
		expect(result.observations).toEqual({
			'imagery.mood': {
				'natural-expression': {
					value: 'present',
					confidence: 80,
					reason: '자연스러운 표정이 관측됩니다.',
				},
			},
		})

		const request = vi.mocked(generateText).mock.calls[0]?.[0] as {
			messages?: Array<{ content?: Array<{ text?: string }> }>
		}
		const content = request.messages?.[0]?.content ?? []
		const jsonText = content.find((part) => part.text?.startsWith('{"checks":'))?.text
		const serialized = JSON.parse(jsonText ?? '{}') as {
			checks: { key: string; kind: string }[]
		}
		expect(serialized.checks.find((entry) => entry.key === 'imagery.advice')?.kind).toBe(
			'advisory',
		)
		expect(serialized.checks.find((entry) => entry.key === 'imagery.mood')?.kind).toBe(
			'criteria',
		)

		const schema = (
			vi.mocked(Output.object).mock.calls.at(-1)?.[0] as {
				schema: { safeParse: (value: unknown) => { success: boolean } }
			}
		).schema
		expect(
			schema.safeParse({
				results: {
					'imagery.mood': {
						observations: {
							'natural-expression': {
								value: 'present',
								confidence: 80,
								reason: 'ok',
							},
						},
					},
					'imagery.advice': { advice: '조언 문단' },
				},
			}).success,
		).toBe(true)
		expect(
			schema.safeParse({
				results: {
					'imagery.mood': {
						observations: {
							'natural-expression': {
								value: 'present',
								confidence: 80,
								reason: 'ok',
							},
						},
					},
					'imagery.advice': { advice: '' },
				},
			}).success,
		).toBe(false)
	})

	it('advisory 체크는 criteria가 없어도 invalid_criteria로 떨어지지 않는다', async () => {
		vi.mocked(generateText).mockResolvedValue({
			output: { results: { 'imagery.advice': { advice: '조언 문단' } } },
			usage: {
				inputTokens: 10,
				inputTokenDetails: { noCacheTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 },
				outputTokens: 5,
				outputTokenDetails: { textTokens: 5, reasoningTokens: 0 },
				totalTokens: 15,
				raw: {},
			},
		} as unknown as Awaited<ReturnType<typeof generateText>>)
		const { runAiCheck } = await import(
			'@/features/asset-check/repositories/ai-check.ai.repository'
		)

		const result = await runAiCheck(toAiPlans([advisoryCheck]), 'rule-spec-model', {
			image: { data: Buffer.from('png'), mediaType: 'image/png' },
			pixels: [],
			palette: [],
		})

		expect(result.failure).toBeUndefined()
		expect(result.advices['imagery.advice']).toBe('조언 문단')
	})

	it('measure criterion은 숫자 관측 스키마로, presence는 enum 스키마로 조립한다', async () => {
		const measureCheck: RuntimeCheck = {
			...checks[0],
			key: 'logo.size.minimum',
			heuristicCriteria: [
				{
					id: 'logo-area',
					question: '로고 점유 면적 비율(%)은?',
					kind: 'measure',
					operator: 'gte',
					expected: 5,
					unit: '%',
				},
				{ id: 'legible', question: '로고가 판독 가능한가?', expected: 'present' },
			],
		}
		vi.mocked(generateText).mockResolvedValue({
			output: {
				results: {
					'logo.size.minimum': {
						observations: {
							'logo-area': { value: 12, confidence: 80, reason: '약 12%' },
							legible: { value: 'present', confidence: 90, reason: '선명함' },
						},
					},
				},
			},
			usage: {
				inputTokens: 10,
				inputTokenDetails: { noCacheTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 },
				outputTokens: 5,
				outputTokenDetails: { textTokens: 5, reasoningTokens: 0 },
				totalTokens: 15,
				raw: {},
			},
		} as unknown as Awaited<ReturnType<typeof generateText>>)

		const { runAiCheck } = await import(
			'@/features/asset-check/repositories/ai-check.ai.repository'
		)
		const result = await runAiCheck(toAiPlans([measureCheck]), 'rule-spec-model', {
			image: { data: Buffer.from('png'), mediaType: 'image/png' },
			pixels: [],
			palette: [],
		})

		expect(result.failure).toBeUndefined()
		expect(result.observations['logo.size.minimum']?.['logo-area']?.value).toBe(12)

		const request = vi.mocked(generateText).mock.calls[0]?.[0] as {
			messages?: Array<{ content?: Array<{ text?: string }> }>
		}
		const content = request.messages?.[0]?.content ?? []
		const jsonText = content.find((part) => part.text?.startsWith('{"checks":'))?.text
		const serialized = JSON.parse(jsonText ?? '{}') as {
			checks: { criteria: Record<string, unknown>[] }[]
		}
		// AI에 전달된 criteria JSON은 기대값·연산에 블라인드
		expect(serialized.checks[0]?.criteria[0]).toEqual({
			id: 'logo-area',
			question: '로고 점유 면적 비율(%)은?',
			kind: 'measure',
			unit: '%',
		})
		expect(serialized.checks[0]?.criteria[1]).toEqual({
			id: 'legible',
			question: '로고가 판독 가능한가?',
			kind: 'presence',
		})
	})
})

describe('heuristic observation 스키마', () => {
	it('kind별 관측값 스키마를 강제한다', () => {
		expect(
			presenceObservationSchema.safeParse({
				value: 'not_applicable',
				confidence: 95,
				reason: '대상 없음',
			}).success,
		).toBe(true)
		expect(
			measureObservationSchema.safeParse({ value: 12, confidence: 80, reason: '12%' })
				.success,
		).toBe(true)
		expect(
			measureObservationSchema.safeParse({ value: 'present', confidence: 80, reason: 'x' })
				.success,
		).toBe(false)
	})
})

describe('unwrapStringifiedResults', () => {
	it('results를 JSON 문자열로 감싼 응답에서 그 한 겹을 벗긴다', async () => {
		const { unwrapStringifiedResults } = await import(
			'@/features/asset-check/repositories/ai-check.ai.repository'
		)
		// 실측으로 잡은 실패 원문 모양(10회 중 1회).
		const observations = {
			'6a85397d7ac8af6631148643': {
				value: 'absent',
				confidence: 85,
				reason: '기울어짐 없음',
			},
		}
		const wrapped = JSON.stringify({
			results: JSON.stringify({ 'logo-misuse': { observations } }),
		})

		expect(JSON.parse(unwrapStringifiedResults(wrapped))).toEqual({
			results: { 'logo-misuse': { observations } },
		})
	})

	it('안쪽 문자열 끝에 닫는 괄호가 하나 더 붙어 와도 벗긴다', async () => {
		const { unwrapStringifiedResults } = await import(
			'@/features/asset-check/repositories/ai-check.ai.repository'
		)
		const observations = {
			'6a85397d7ac8af6631148643': {
				value: 'absent',
				confidence: 75,
				reason: '기울어짐 없음',
			},
		}
		// 실측한 실패 원문은 안쪽 문자열이 `...}}}}}\n`로 끝난다 — 바깥 닫는 괄호가 섞여 온다.
		const wrapped = JSON.stringify({
			results: `${JSON.stringify({ 'logo-misuse': { observations } })}}\n`,
		})

		expect(JSON.parse(unwrapStringifiedResults(wrapped))).toEqual({
			results: { 'logo-misuse': { observations } },
		})
	})

	it('정상 응답과 알아볼 수 없는 응답은 그대로 통과시킨다', async () => {
		const { unwrapStringifiedResults } = await import(
			'@/features/asset-check/repositories/ai-check.ai.repository'
		)
		const healthy = JSON.stringify({ results: { 'logo-misuse': { observations: {} } } })

		expect(unwrapStringifiedResults(healthy)).toBe(healthy)
		// results 안이 JSON이 아니면 원문을 그대로 넘겨 검증이 실패를 판정하게 둔다.
		expect(unwrapStringifiedResults('{"results":"not json"}')).toBe('{"results":"not json"}')
		expect(unwrapStringifiedResults('완전히 JSON이 아님')).toBe('완전히 JSON이 아님')
	})
})
