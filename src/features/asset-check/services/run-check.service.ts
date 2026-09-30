import {
	toCheckResult,
	toDeterministicCheckResult,
} from '@/features/asset-check/checkers/check-result.adapter'
import { opaquePixels } from '@/features/asset-check/checkers/color-metrics'
import type {
	AiUsage,
	CheckerContext,
	CheckResult,
	RawCheckResult,
} from '@/features/asset-check/checkers/types'
import {
	type AiCheckPlan,
	type CheckPlan,
	planChecks,
} from '@/features/asset-check/domain/check-plan'
import {
	evaluateAdvisory,
	evaluateHeuristic,
} from '@/features/asset-check/domain/heuristic.evaluator'
import { needsReview } from '@/features/asset-check/domain/needs-review'
import type { RuntimeCheck } from '@/features/asset-check/domain/runtime-check'
import {
	type AiCheckRunResult,
	runAiCheck,
} from '@/features/asset-check/repositories/ai-check.ai.repository'
import { extractPixelGrid } from '@/features/asset-check/repositories/image-decoder.sharp.repository'
import { getCheckPalette } from '@/features/asset-check/services/get-check-palette.service'
import { getRuntimeChecks } from '@/features/asset-check/services/get-check-ruleset.service'
import { detectCheckImageMediaType } from '@/features/asset-check/utils/image-format'

export interface ImmediateCheckResult {
	results: Record<string, CheckResult>
	pendingCheckKeys: string[]
}

export interface HeuristicCheckResult {
	results: Record<string, CheckResult>
	aiUsage?: AiUsage
	/**
	 * 합치기 전의 모델 그룹별 사용량. `aiUsage`는 세션 문서에 남길 단일 값이라 모델명을 이어 붙이므로
	 * 계정별 집계에는 쓸 수 없다 — 모델마다 단가가 달라서 한 행으로 뭉치면 뜻을 잃는다.
	 */
	aiUsages?: AiUsage[]
}

/** AI 호출 1건에 싣는 최대 Check 수 — structured output 문법 컴파일 한도 이내로 유지한다. */
const AI_CHECK_BATCH_SIZE = 4

/**
 * 오버레이 가독성용 그리드 해상도. 1920px 산출물이 512px로 줄어도 타이틀 획이 3px 이상 남는다.
 * ponytail: 512로 고정한다 — 더 키우면 픽셀 수가 제곱으로 늘고, 더 줄이면 워드마크 획이 1px 밑으로 내려간다.
 */
const DETAIL_GRID_MAX_DIM = 512

/**
 * 검수 대상 이미지를 deterministic/manual 룰까지만 즉시 판정한다.
 * 실행 방식 판단은 planChecks가 한 번에 끝내고, 여기서는 plan kind만 기계적으로 소비한다.
 * AI 계열 plan(실행 불가 포함)은 pendingCheckKeys로 분리해 후속 요청이 실행한다.
 * 이미지 decode I/O는 image-decoder repository가, 룰·팔레트 조회 I/O는 각 조회 service의 Payload repository가 소유한다.
 */
export async function runImmediateCheck(
	buffer: Buffer,
	inputChecks?: RuntimeCheck[],
): Promise<ImmediateCheckResult> {
	const [grid, detailGrid, checks, palette] = await Promise.all([
		extractPixelGrid(buffer),
		// 오버레이 가독성은 글자 획 경계를 봐야 해서 128px로는 측정이 성립하지 않는다.
		extractPixelGrid(buffer, DETAIL_GRID_MAX_DIM),
		inputChecks ?? getRuntimeChecks(),
		getCheckPalette(),
	])
	const pixels = opaquePixels(grid)
	const image = imageInputFrom(buffer)

	const results: Record<string, CheckResult> = {}
	const pendingCheckKeys: string[] = []
	const ctx = { pixels, palette, grid, detailGrid, image }
	for (const plan of planChecks(checks)) {
		const { check } = plan
		if (results[check.key]) continue
		switch (plan.kind) {
			case 'deterministic':
				results[check.key] = runDeterministicPlan(plan, ctx)
				break
			case 'manual-review':
				results[check.key] = toCheckResult(
					{
						status: 'needs_review',
						fulfillment: null,
						detail: '브랜드 담당자 확인 필요',
					},
					check,
					{ key: 'manual', type: 'manual' },
				)
				break
			case 'unrunnable':
				if (plan.reasonCode === 'checker_not_registered') {
					// 기존엔 결과 없이 조용히 탈락하던 경로(신규 세션에선 도달 불가).
					// 전수 분류 원칙에 따라 needs_review로 명시한다 — 유일한 의도적 동작 변화.
					results[check.key] = toCheckResult(needsReview(plan.reasonCode), check, {
						key: check.checkerKey ?? 'unregistered',
						type: 'algorithm',
					})
				} else {
					// AI 계열 실행 불가는 기존처럼 pending으로 남겨 후속 AI 단계가 needs_review로 확정한다.
					pendingCheckKeys.push(check.key)
				}
				break
			default:
				pendingCheckKeys.push(check.key)
		}
	}

	return { results, pendingCheckKeys }
}

/**
 * 후속 AI 검수 요청에서 heuristic 룰만 판정한다.
 * 첫 응답의 pendingCheckKeys를 기준으로 실행 범위를 좁힌다.
 * 모델 I/O는 ai-check Agent repository가 소유한다.
 */
export async function runHeuristicCheck(
	buffer: Buffer,
	checkKeys: string[],
	inputChecks?: RuntimeCheck[],
): Promise<HeuristicCheckResult> {
	const checks = (inputChecks ?? (await getRuntimeChecks(checkKeys))).filter((check) =>
		checkKeys.includes(check.key),
	)
	const plans = planChecks(checks)

	// AI 계열 실행 불가 판정은 plan 단계에서 끝났다 — 모델 호출 없이 needs_review로 확정한다.
	// deterministic(checker 미등록 포함)·manual-review plan은 이 단계 대상이 아니라 결과를 만들지 않는다.
	const results: Record<string, CheckResult> = {}
	for (const plan of plans) {
		if (plan.kind !== 'unrunnable' || plan.reasonCode === 'checker_not_registered') continue
		results[plan.check.key] = toCheckResult(needsReview(plan.reasonCode), plan.check, {
			key: 'ai',
			type: 'ai',
		})
	}

	const byModel = new Map<string, AiCheckPlan[]>()
	for (const plan of plans) {
		if (plan.kind !== 'ai-criteria' && plan.kind !== 'ai-advisory') continue
		byModel.set(plan.model, [...(byModel.get(plan.model) ?? []), plan])
	}
	// 한 요청에 check가 많으면 structured output 문법 한도와 요청 크기(레퍼런스 이미지) 한도를
	// 넘고, 출력이 길수록 후반부 관측 품질이 떨어진다. 모델 그룹을 배치로 나눠 병렬 호출한다.
	const groups = [...byModel.entries()].flatMap(([model, modelPlans]) => {
		const batches: { model: string; plans: AiCheckPlan[] }[] = []
		for (let i = 0; i < modelPlans.length; i += AI_CHECK_BATCH_SIZE) {
			batches.push({ model, plans: modelPlans.slice(i, i + AI_CHECK_BATCH_SIZE) })
		}
		return batches
	})
	if (groups.length === 0) return { results }

	const ctx: CheckerContext = { image: imageInputFrom(buffer), pixels: [], palette: [] }
	const runs = await Promise.all(
		groups.map(async (group) => ({
			plans: group.plans,
			run: await runAiCheck(group.plans, group.model, ctx),
		})),
	)
	for (const { plans: groupPlans, run } of runs) {
		for (const plan of groupPlans) {
			results[plan.check.key] = toCheckResult(toAiRawResult(plan, run), plan.check, {
				key: 'ai',
				type: 'ai',
			})
		}
	}

	const aiUsages = runs.flatMap(({ run }) => (run.aiUsage ? [run.aiUsage] : []))
	return {
		results,
		aiUsage: mergeAiUsages(aiUsages),
		aiUsages,
	}
}

/** AI 실행 결과를 plan kind에 따라 Check 1건의 원판정으로 변환한다. 실행 가능 여부 판단은 plan 단계에서 끝났다. */
function toAiRawResult(plan: AiCheckPlan, run: AiCheckRunResult): RawCheckResult {
	if (run.unavailableReferenceCheckKeys?.includes(plan.check.key)) {
		return needsReview('reference_asset_unavailable')
	}
	if (run.failure) return needsReview(run.failure.reasonCode)
	return plan.kind === 'ai-advisory'
		? evaluateAdvisory(run.advices[plan.check.key])
		: evaluateHeuristic(plan.criteria, run.observations[plan.check.key])
}

/** 모델 그룹별 usage를 세션 저장용 단일 usage로 합산한다. */
function mergeAiUsages(usages: AiUsage[]): AiUsage | undefined {
	if (usages.length <= 1) return usages[0]
	const total = (read: (usage: AiUsage) => number | undefined) =>
		usages.reduce((sum, usage) => sum + (read(usage) ?? 0), 0)
	return {
		model: usages.map((usage) => usage.model).join(', '),
		callCount: total((usage) => usage.callCount),
		inputTokens: total((usage) => usage.inputTokens),
		outputTokens: total((usage) => usage.outputTokens),
		totalTokens: total((usage) => usage.totalTokens),
		cacheReadInputTokens: total((usage) => usage.cacheReadInputTokens),
		cacheWriteInputTokens: total((usage) => usage.cacheWriteInputTokens),
		reasoningTokens: total((usage) => usage.reasoningTokens),
		rawUsage: { groups: usages.map((usage) => usage.rawUsage ?? {}) },
	}
}

// checker 등록 확인은 plan 단계에서 끝났다. 두 계약 모두 항상 결과를 돌려 plan 실행이 전수 결과를 보장한다.
function runDeterministicPlan(
	plan: Extract<CheckPlan, { kind: 'deterministic' }>,
	ctx: CheckerContext,
): CheckResult {
	const { check, checker, checkerKey } = plan
	if (checker.executor === 'deterministic') {
		return toDeterministicCheckResult(checker.run(ctx, check.options), check, checkerKey)
	}
	return toCheckResult(checker.run(ctx), check, { key: checkerKey, type: 'algorithm' })
}
function imageInputFrom(buffer: Buffer): CheckerContext['image'] {
	const mediaType = detectCheckImageMediaType(buffer)
	return mediaType ? { data: buffer, mediaType } : undefined
}
