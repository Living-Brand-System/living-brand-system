/**
 * Checker registry — RuleChecker checkerKey와 실행 구현을 연결한다.
 * 새 checker는 신식 계약(측정 전용 DeterministicChecker + evaluator 기준 비교, contrast 참조)으로
 * 작성하고 executor: 'deterministic'으로 등록한다. executor: 'algorithm' 항목(판정 자체 소유·기준 하드코딩)은 구식 계약이다.
 */

import { z } from 'zod'
import { contrastOptionsSchema } from '@/features/quality-rule/contrast-options'
import { overlayLegibilityOptionsSchema } from '@/features/quality-rule/overlay-legibility-options'
import { backgroundToneChecker } from './background-tone.checker'
import { makeCanvasFormatChecker } from './canvas-format.checker'
import { clearSpaceChecker } from './clear-space.checker'
import { colorCombinationChecker } from './color-combination.checker'
import { extractDominantColorPair } from './color-pair.extractor'
import { contrastChecker } from './contrast.checker'
import { evaluateExtraction, evaluateMeasurement } from './deterministic.evaluator'
import { measureOverlayLegibility } from './overlay-legibility.checker'
import { paletteComplianceChecker } from './palette-compliance.checker'
import { relativeSizeChecker } from './relative-size.checker'
import { spotColorChecker } from './spot-color.checker'
import type { AlgorithmChecker, CheckerContext, DeterministicEvaluationResult } from './types'

export type RegisteredChecker =
	| {
			executor: 'deterministic'
			run: (ctx: CheckerContext, options: unknown) => DeterministicEvaluationResult
	  }
	| { executor: 'algorithm'; run: AlgorithmChecker }

const canvasFormatOptionsSchema = z.strictObject({
	formats: z
		.array(
			z.strictObject({
				label: z.string().min(1),
				width: z.number().positive(),
				height: z.number().positive(),
			}),
		)
		.min(1),
	tolerance: z.number().min(0).optional(),
	ignoreOrientation: z.boolean().optional(),
})

const algorithm = (run: AlgorithmChecker) => (): RegisteredChecker => ({
	executor: 'algorithm',
	run,
})

/** 오버레이 가독성 — 고해상도 그리드가 필요하다. grid(128px)로는 글자 획이 남지 않는다. */
function runOverlayLegibility(
	ctx: CheckerContext,
	options: unknown,
): DeterministicEvaluationResult {
	const parsed = overlayLegibilityOptionsSchema.safeParse(options)
	if (!parsed.success) {
		return evaluateMeasurement({ state: 'not_measurable', reasonCode: 'invalid_criteria' }, [])
	}
	const grid = ctx.detailGrid
	if (!grid) {
		return evaluateMeasurement(
			{ state: 'not_measurable', reasonCode: 'raster_not_available' },
			parsed.data.criteria,
		)
	}
	return evaluateMeasurement(
		measureOverlayLegibility(grid, parsed.data.parameters),
		parsed.data.criteria,
	)
}

function runContrast(ctx: CheckerContext, options: unknown): DeterministicEvaluationResult {
	const parsed = contrastOptionsSchema.safeParse(options)
	if (!parsed.success) {
		return evaluateMeasurement({ state: 'not_measurable', reasonCode: 'invalid_criteria' }, [])
	}
	const extraction = ctx.grid
		? extractDominantColorPair(ctx.grid)
		: { state: 'not_extractable' as const, reasonCode: 'raster_not_available' }
	return evaluateExtraction(
		extraction,
		contrastChecker,
		parsed.data.criteria,
		parsed.data.parameters,
	)
}

/**
 * checker key → checker 레지스트리. options가 유효하지 않으면 항목이 null을 돌려 미구현으로 판정된다.
 * 기존 color 검수는 palette(허용 색) + pairing(허용 조합)을 유지하고,
 * 정규화된 contrast는 측정·기준 평가 경로로 별도 등록한다.
 * color.mode는 파일 색모드 메타가 래스터에 없어 spot-color와 같은 픽셀 프록시로 판정한다.
 */
const checkers: Record<string, (options?: unknown) => RegisteredChecker | null> = {
	'palette-compliance': algorithm(paletteComplianceChecker),
	'overlay-legibility': (options) =>
		overlayLegibilityOptionsSchema.safeParse(options).success
			? { executor: 'deterministic', run: runOverlayLegibility }
			: null,
	'color-combination': algorithm(colorCombinationChecker),
	'spot-color': algorithm(spotColorChecker),
	'background-tone': algorithm(backgroundToneChecker),
	'clear-space': algorithm(clearSpaceChecker),
	'relative-size': algorithm(relativeSizeChecker),
	'canvas-format': (options) => {
		const parsed = canvasFormatOptionsSchema.safeParse(options)
		return parsed.success
			? {
					executor: 'algorithm',
					run: makeCanvasFormatChecker(parsed.data.formats, parsed.data),
				}
			: null
	},
	contrast: () => ({ executor: 'deterministic', run: runContrast }),
}

export function getChecker(checkerKey: string, options?: unknown): RegisteredChecker | null {
	return checkers[checkerKey]?.(options) ?? null
}

export function hasChecker(checkerKey: string, options?: unknown): boolean {
	return getChecker(checkerKey, options) !== null
}
