import { anthropic } from '@ai-sdk/anthropic'
import {
	extractJsonMiddleware,
	generateText,
	type LanguageModelUsage,
	NoObjectGeneratedError,
	Output,
	wrapLanguageModel,
} from 'ai'
import { z } from 'zod'
import { env } from '@/env'
import type { AiUsage, CheckerContext } from '@/features/asset-check/checkers/types'
import { buildAiObservationTask } from '@/features/asset-check/domain/ai-observation-task'
import type { AiCheckPlan } from '@/features/asset-check/domain/check-plan'
import {
	type HeuristicObservation,
	measureObservationSchema,
	presenceObservationSchema,
} from '@/features/asset-check/domain/heuristic.evaluator'
import {
	NEEDS_REVIEW_DETAILS,
	type NeedsReviewReasonCode,
} from '@/features/asset-check/domain/needs-review'
import type { CheckReferenceAsset, RuntimeCheck } from '@/features/asset-check/domain/runtime-check'
import {
	compressForAiReference,
	resizeForAiVision,
} from '@/features/asset-check/repositories/image-decoder.sharp.repository'

export interface AiCheckRunResult {
	observations: Record<string, Record<string, HeuristicObservation>>
	advices: Record<string, string>
	failure?: { detail: string; reasonCode: NeedsReviewReasonCode }
	unavailableReferenceCheckKeys?: string[]
	aiUsage?: AiUsage
}

/**
 * Asset check의 AI 기반 휴리스틱 검수 adapter.
 * 모델 호출(AI SDK)과 레퍼런스 이미지 fetch I/O를 소유한다.
 * 실행 가능 여부 판단은 CheckPlan 타입이 보증하므로, 여기서는 환경 실패(키·이미지·호출)만 failure로 남긴다.
 */
export async function runAiCheck(
	plans: AiCheckPlan[],
	model: string,
	ctx: CheckerContext,
): Promise<AiCheckRunResult> {
	if (!env.ANTHROPIC_API_KEY) return failed('ai_not_configured')
	if (!ctx.image) return failed('image_not_available')
	const checks = plans.map((plan) => plan.check)

	let unavailableReferenceCheckKeys: string[] | undefined
	try {
		const [targetImage, referenceFilesByKey] = await Promise.all([
			resizeForAiVision(ctx.image.data),
			loadAiReferenceFiles(checks),
		])
		unavailableReferenceCheckKeys = findUnavailableAiReferenceCheckKeys(
			checks,
			referenceFilesByKey,
		)
		const runnableChecks = checks.filter(
			(check) => !unavailableReferenceCheckKeys?.includes(check.key),
		)
		if (runnableChecks.length === 0) {
			return { observations: {}, advices: {}, unavailableReferenceCheckKeys }
		}
		const referenceKeys = new Set(
			runnableChecks.flatMap((check) => check.referenceAssets.map(aiReferenceAssetKey)),
		)
		const referenceFiles = [...referenceKeys].flatMap((key) => {
			const file = referenceFilesByKey.get(key)
			return file ? [file] : []
		})
		const observationTask = buildAiObservationTask(runnableChecks, referenceFiles.length > 0)
		const schema = buildAiCheckSchema(runnableChecks)
		const { output, usage } = await generateText({
			// jsonTool의 유일한 실패 모양(results를 JSON 문자열로 한 겹 감싸기)은 스키마 검증 전에
			// 미들웨어가 벗긴다. 그래서 outputFormat으로 형식을 강제할 필요가 없다.
			model: wrapLanguageModel({
				model: anthropic(model),
				middleware: extractJsonMiddleware({ transform: unwrapStringifiedResults }),
			}),
			output: Output.object({ schema }),
			// 🔴 outputFormat은 응답이 같은데도 출력 토큰을 간헐적으로 2배 태운다 — 지연은 출력
			// 토큰에 비례하므로(약 80 tok/s) 그대로 2배가 된다. 4 check·criterion 10개 실측:
			// outputFormat 17회 median 24.6초(최대 36.4초), jsonTool 10회 median 14.2초(최대 16.1초).
			// 'auto'로 두지 않는 이유는 SDK가 아는 모델에서는 auto가 outputFormat으로 갈려서,
			// 같은 코드가 admin에서 고른 모델에 따라 2배 느려지기 때문이다.
			providerOptions: { anthropic: { structuredOutputMode: 'jsonTool' } },
			// 기본값 4096이면 check가 많을 때 관측값 JSON이 잘려 통째로 실패한다.
			// criterion당 reason(≤300자) 포함 ~300토큰, advisory당 ~800토큰으로 잡는다.
			maxOutputTokens: Math.min(
				64000,
				2000 +
					runnableChecks.reduce(
						(sum, check) =>
							sum +
							(check.executor === 'manual'
								? 800
								: (check.heuristicCriteria?.length ?? 0) * 300),
						0,
					),
			),
			system: observationTask.systemPrompt,
			messages: [
				{
					role: 'user',
					content: [
						{
							type: 'text',
							text: [
								'The next text part contains the checks as JSON source data.',
								...observationTask.instructions,
							].join('\n'),
						},
						{
							type: 'text',
							text: JSON.stringify({ checks: observationTask.checks }),
							// 여기까지(system + 지시문 + checks JSON)가 이미지와 무관하게 고정이다.
							// 한 세션에서 여러 이미지를 검수하면 이 프리픽스가 매번 새 입력으로 청구된다.
							// 🔴 breakpoint는 대상 이미지 **앞**에만 둘 수 있다 — 이미지는 요청마다 바뀌므로
							//    그 뒤(레퍼런스 포함)는 캐시되지 않는다. 레퍼런스까지 캐시하려면 순서를
							//    바꿔야 하는데, 프롬프트 구성이 바뀌면 판정도 바뀔 수 있어 하지 않는다.
							providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
						},
						{ type: 'text', text: 'Target image to check:' },
						{
							type: 'file',
							mediaType: ctx.image.mediaType,
							data: targetImage,
						},
						...referenceFiles.flatMap((file) => [
							{
								type: 'text' as const,
								text: `Reference image (${file.role}): ${file.name}`,
							},
							{
								type: 'file' as const,
								mediaType: file.mediaType,
								data: file.data,
							},
						]),
					],
				},
			],
		})

		const results = output.results as Record<
			string,
			{
				observations?: Record<string, HeuristicObservation>
				advice?: string
			}
		>
		return {
			observations: Object.fromEntries(
				runnableChecks
					.filter((check) => check.executor !== 'manual')
					.map((check) => [check.key, results[check.key]?.observations ?? {}]),
			),
			advices: Object.fromEntries(
				runnableChecks.flatMap((check) => {
					const advice = results[check.key]?.advice
					return check.executor === 'manual' && advice ? [[check.key, advice]] : []
				}),
			),
			...(unavailableReferenceCheckKeys.length ? { unavailableReferenceCheckKeys } : {}),
			aiUsage: toAiUsage(model, usage),
		}
	} catch (error) {
		// 실패는 needs_review로만 수렴해 원인이 숨는다. 진단용으로 사유는 남긴다.
		console.error('[ai-check] AI 평가 실패:', error instanceof Error ? error.message : error)
		return NoObjectGeneratedError.isInstance(error)
			? failed('ai_output_invalid', unavailableReferenceCheckKeys)
			: failed('ai_request_failed', unavailableReferenceCheckKeys)
	}
}

/**
 * jsonTool 모드의 유일한 실패 모양을 스키마 검증 전에 되돌린다 — 모델이 간헐적으로
 * `results` 값을 JSON 문자열로 한 겹 더 감싸 보낸다(24회 중 2회 실측):
 *   {"results":"{\"logo-misuse\":{\"observations\":{...}}}}\n"}
 * 🔴 안쪽 문자열 끝에는 바깥 객체의 닫는 괄호가 하나 더 섞여 온다 — 그래서 그냥 JSON.parse하면
 *    "Unexpected non-whitespace character after JSON"으로 실패한다. 뒤를 잘라가며 값을 찾는다.
 * 알아볼 수 없는 응답은 손대지 않고 그대로 넘겨, 판정은 스키마 검증이 막게 둔다.
 * 🔴 이 transform은 SDK 기본 transform(마크다운 fence 제거)을 대체한다. jsonTool 응답은
 *    tool 입력에서 온 text라 fence가 붙지 않으므로 fence 처리는 다시 만들지 않는다.
 */
export function unwrapStringifiedResults(text: string): string {
	let parsed: unknown
	try {
		parsed = JSON.parse(text)
	} catch {
		return text
	}
	if (parsed === null || typeof parsed !== 'object') return text
	const { results } = parsed as { results?: unknown }
	if (typeof results !== 'string') return text
	const inner = parseJsonPrefix(results)
	return inner === undefined ? text : JSON.stringify({ ...parsed, results: inner })
}

/**
 * 뒤에 군더더기가 붙은 JSON에서 앞쪽의 완전한 값만 읽는다.
 * ponytail: 뒤에서 한 글자씩 줄이는 O(n) 스캔이다 — 실측 사례는 군더더기가 끝에 1~2자라 1~2회에
 * 끝난다. 앞쪽까지 깨진 응답에서만 전 길이를 훑고, 그때는 어차피 검증이 실패시킨다.
 */
function parseJsonPrefix(text: string): unknown {
	const trimmed = text.trim()
	for (let end = trimmed.length; end > 1; end--) {
		try {
			return JSON.parse(trimmed.slice(0, end))
		} catch {
			// 다음 길이로 계속한다.
		}
	}
	return undefined
}

function buildAiCheckSchema(checks: RuntimeCheck[]) {
	return z.strictObject({
		results: z.strictObject(
			Object.fromEntries(
				checks.map((check) => [
					check.key,
					check.executor === 'manual'
						? z.strictObject({ advice: z.string().min(1) })
						: z.strictObject({
								observations: z.strictObject(
									Object.fromEntries(
										(check.heuristicCriteria ?? []).map((criterion) => [
											criterion.id,
											criterion.kind === 'measure'
												? measureObservationSchema
												: presenceObservationSchema,
										]),
									),
								),
							}),
				]),
			),
		),
	})
}

function toAiUsage(model: string, usage: LanguageModelUsage): AiUsage {
	return {
		model,
		callCount: 1,
		inputTokens: usage.inputTokens,
		outputTokens: usage.outputTokens,
		totalTokens: usage.totalTokens,
		cacheReadInputTokens: usage.inputTokenDetails.cacheReadTokens,
		cacheWriteInputTokens: usage.inputTokenDetails.cacheWriteTokens,
		reasoningTokens: usage.outputTokenDetails.reasoningTokens,
		rawUsage: usage.raw,
	}
}

export async function loadAiReferenceFiles(checks: RuntimeCheck[]) {
	const assets = new Map<string, CheckReferenceAsset>()
	for (const check of checks) {
		for (const asset of check.referenceAssets) assets.set(aiReferenceAssetKey(asset), asset)
	}

	const files = await Promise.all(
		[...assets].map(async ([key, asset]) => {
			try {
				const raw = await readReferenceAsset(asset)
				if (!raw) return [key, null] as const
				const { data, mediaType } = await compressForAiReference(raw, asset.mimeType)
				return [
					key,
					{
						name: asset.name,
						role: asset.role,
						mediaType,
						data,
					},
				] as const
			} catch {
				return [key, null] as const
			}
		}),
	)

	return new Map(files)
}

export function findUnavailableAiReferenceCheckKeys(
	checks: RuntimeCheck[],
	referenceFilesByKey: Awaited<ReturnType<typeof loadAiReferenceFiles>>,
) {
	return checks
		.filter((check) =>
			check.referenceAssets.some(
				(asset) => !referenceFilesByKey.get(aiReferenceAssetKey(asset)),
			),
		)
		.map((check) => check.key)
}

async function readReferenceAsset(asset: CheckReferenceAsset): Promise<Buffer | null> {
	// staging은 Vercel 로그인으로 보호돼 자기 자신에게 보내는 요청도 막힌다. 우회 비밀값은
	// 상대 경로(= 이 앱)로 가는 요청에만 싣는다 — 외부 절대 URL에 실으면 제3자에게 샌다.
	const bypass = isAbsoluteUrl(asset.url) ? undefined : env.VERCEL_AUTOMATION_BYPASS_SECRET
	const response = await fetch(toAbsoluteUrl(asset.url), {
		headers: bypass ? { 'x-vercel-protection-bypass': bypass } : undefined,
	})
	if (!response.ok) return null
	return Buffer.from(await response.arrayBuffer())
}

export function aiReferenceAssetKey(asset: CheckReferenceAsset) {
	return `${asset.url}:${asset.role}`
}

const isAbsoluteUrl = (url: string) => /^https?:\/\//.test(url)

function toAbsoluteUrl(url: string) {
	if (isAbsoluteUrl(url)) return url
	const origin =
		env.NEXT_PUBLIC_SITE_URL ||
		(env.VERCEL_URL ? `https://${env.VERCEL_URL}` : 'http://localhost:3000')
	return new URL(url, origin).toString()
}

function failed(
	reasonCode: NeedsReviewReasonCode,
	unavailableReferenceCheckKeys?: string[],
): AiCheckRunResult {
	return {
		observations: {},
		advices: {},
		failure: { detail: NEEDS_REVIEW_DETAILS[reasonCode], reasonCode },
		...(unavailableReferenceCheckKeys?.length ? { unavailableReferenceCheckKeys } : {}),
	}
}
