import { describe, expect, it } from 'vitest'
import type { CheckResult } from '@/features/asset-check/checkers/types'
import type { CheckSection } from '@/features/asset-check/domain/runtime-check'
import type { CheckImage } from '@/features/asset-check/types'
import { buildCheckReviewView } from '@/features/asset-check/utils/build-check-review-view'

const scenarios = [
	{
		key: 'quick',
		title: '빠른 기본 검수',
		checkKeys: [
			'color.palette',
			'color.combination',
			'color.contrast',
			'logo.size.minimum',
			'logo.space.clear',
		],
	},
	{
		key: 'stationery',
		title: '명함/스테이셔너리 검수',
		checkKeys: ['application.stationery.format', 'color.palette'],
	},
]

const sections: CheckSection[] = [
	{
		title: 'Brand Logo',
		slug: 'brand-logo',
		groupTitle: 'Brand Design Elements',
		groupSlug: 'brand-design-elements',
		chapterTitle: 'Brand Design Elements',
		chapterSlug: 'brand-design-elements',
		chapterOrder: 1,
		topicTitle: 'Brand Logo',
		topicSlug: 'brand-logo',
		topicOrder: 1,
		checks: [
			check('logo.size.minimum'),
			check('logo.space.clear'),
			check('color.palette'),
			{ ...check('logo.unimplemented'), implemented: false },
			check('application.stationery.format'),
		],
	},
	{
		title: 'Color System',
		slug: 'color-system',
		groupTitle: 'Brand Design Elements',
		groupSlug: 'brand-design-elements',
		chapterTitle: 'Brand Design Elements',
		chapterSlug: 'brand-design-elements',
		chapterOrder: 1,
		topicTitle: 'Color System',
		topicSlug: 'color-system',
		topicOrder: 2,
		checks: [check('color.palette'), check('color.combination'), check('color.contrast')],
	},
]

describe('buildCheckReviewView', () => {
	it('returns an empty view when no CheckScenario is published', () => {
		expect(
			buildCheckReviewView({
				sections,
				scenarios: [],
				scenarioKey: '',
				selected: null,
				showFailOnly: false,
			}),
		).toEqual({
			rows: [],
			summary: {
				pass: 0,
				ok: 0,
				fail: 0,
				advisory: 0,
				notApplicable: 0,
				pendingManualCheck: 0,
			},
		})
	})

	it('keeps summary empty before any check result exists', () => {
		const view = buildCheckReviewView({
			sections,
			scenarios,
			scenarioKey: 'quick',
			selected: null,
			showFailOnly: false,
		})

		expect(view.summary).toEqual({
			pass: 0,
			ok: 0,
			fail: 0,
			advisory: 0,
			notApplicable: 0,
			pendingManualCheck: 0,
		})
		expect(view.rows[0]?.scenarioLabel).toBe('빠른 기본 검수')
		expect(view.rows[0]?.anchorId).toBe('quick')
		expect(view.rows[1]?.scenarioLabel).toBeNull()
		expect(view.rows[0]?.guidelineHref).toBe('/guideline/brand-design-elements/brand-logo')
		expect(view.rows.every((row) => !row.expandable)).toBe(true)
		expect(view.rows.every((row) => row.detail === null)).toBe(true)
		expect(view.rows.map((row) => row.check.key)).toEqual([
			'color.palette',
			'color.combination',
			'color.contrast',
			'logo.size.minimum',
			'logo.space.clear',
		])
	})

	it('builds fail-only rows and merges duplicate Check sections', () => {
		const selected = image({
			'logo.size.minimum': result('logo.size.minimum', 'pass'),
			'logo.space.clear': result('logo.space.clear', 'fail'),
			'color.palette': result('color.palette', 'fail'),
			'color.combination': result('color.combination', 'ok'),
			'color.contrast': result('color.contrast', 'pass'),
		})

		const view = buildCheckReviewView({
			sections,
			scenarios,
			scenarioKey: 'quick',
			selected,
			showFailOnly: true,
		})

		expect(view.summary).toEqual({
			pass: 2,
			ok: 1,
			fail: 2,
			advisory: 0,
			notApplicable: 0,
			pendingManualCheck: 0,
		})
		expect(view.rows.map((row) => row.check.key)).toEqual(['color.palette', 'logo.space.clear'])
		expect(view.rows[0]?.appliesTo).toEqual(['Brand Logo', 'Color System'])
	})

	it('advisory 결과는 통과/미통과가 아닌 별도 카운트로 센다', () => {
		const selected = image({
			'logo.size.minimum': result('logo.size.minimum', 'pass'),
			'logo.space.clear': result('logo.space.clear', 'advisory'),
		})

		const view = buildCheckReviewView({
			sections,
			scenarios,
			scenarioKey: 'quick',
			selected,
			showFailOnly: false,
		})

		expect(view.summary).toEqual({
			pass: 1,
			ok: 0,
			fail: 0,
			advisory: 1,
			notApplicable: 0,
			pendingManualCheck: 3,
		})
	})

	it('AI 판정 수치로 성공, 실패, 판단 필요 메시지를 만든다', () => {
		const selected = image({
			'logo.size.minimum': heuristicResult('logo.size.minimum', 'pass', 3),
			'logo.space.clear': heuristicResult('logo.space.clear', 'fail', 2),
			'color.palette': heuristicResult('color.palette', 'needs_review', 1),
		})

		const view = buildCheckReviewView({
			sections,
			scenarios,
			scenarioKey: 'quick',
			selected,
			showFailOnly: false,
		})

		expect(view.rows.find((row) => row.check.key === 'logo.size.minimum')?.detail).toBe(
			'기준 3개를 모두 통과했어요.',
		)
		expect(view.rows.find((row) => row.check.key === 'logo.space.clear')?.detail).toBe(
			'기준 2개를 통과하지 못했어요.',
		)
		expect(view.rows.find((row) => row.check.key === 'color.palette')?.detail).toBe(
			'기준 1개는 판단이 필요해요.',
		)
	})

	it('진행 중 문구를 우선 표시하고 기존 결과는 message로 표시한다', () => {
		const selected = {
			...image({ 'logo.size.minimum': result('logo.size.minimum', 'pass') }),
			status: 'running' as const,
		}

		const view = buildCheckReviewView({
			sections,
			scenarios,
			scenarioKey: 'quick',
			selected,
			showFailOnly: false,
		})

		expect(view.rows.find((row) => row.check.key === 'logo.size.minimum')?.detail).toBe('pass')
		expect(view.rows.find((row) => row.check.key === 'logo.size.minimum')?.expandable).toBe(
			true,
		)
		expect(view.rows.find((row) => row.check.key === 'logo.space.clear')?.detail).toBe(
			'검사 중...',
		)
		expect(view.rows.find((row) => row.check.key === 'logo.space.clear')?.expandable).toBe(
			false,
		)
	})

	it('전 기준 해당 없음 pass는 통과가 아닌 별도 카운트로 센다', () => {
		const naResult = result('logo.space.clear', 'pass')
		naResult.rawResult.reasonCode = 'not_applicable'
		const selected = image({
			'logo.size.minimum': result('logo.size.minimum', 'pass'),
			'logo.space.clear': naResult,
		})

		const view = buildCheckReviewView({
			sections,
			scenarios,
			scenarioKey: 'quick',
			selected,
			showFailOnly: false,
		})

		expect(view.summary).toEqual({
			pass: 1,
			ok: 0,
			fail: 0,
			advisory: 0,
			notApplicable: 1,
			pendingManualCheck: 3,
		})
	})

	it('uses the session ruleset snapshot for criteria and evidence', () => {
		const selected = {
			...image({ 'color.contrast': result('color.contrast', 'pass') }),
			rulesetSnapshot: [
				{
					...check('color.contrast'),
					evidence: '검수 당시 저장된 근거',
					options: {
						criteria: [
							{ measurement: 'contrastRatio', operator: 'gte', expected: 4.5 },
						],
					},
				},
			],
		}

		const view = buildCheckReviewView({
			sections,
			scenarios,
			scenarioKey: 'quick',
			selected,
			showFailOnly: false,
		})

		const contrastRow = view.rows.find((row) => row.check.key === 'color.contrast')
		expect(contrastRow?.check).toMatchObject({
			evidence: '검수 당시 저장된 근거',
			options: {
				criteria: [{ measurement: 'contrastRatio', operator: 'gte', expected: 4.5 }],
			},
		})
	})

	it('uses the selected image scenario before the global fallback scenario', () => {
		const selected = image({}, 'stationery')

		const view = buildCheckReviewView({
			sections,
			scenarios,
			scenarioKey: 'quick',
			selected,
			showFailOnly: false,
		})

		expect(view.rows.map((row) => row.check.key)).toEqual([
			'application.stationery.format',
			'color.palette',
		])
	})
})

function check(key: string): CheckSection['checks'][number] {
	return {
		key,
		title: key,
		checker: {
			key: 'test-checker',
			type: 'deterministic',
			implementationKey: 'test-implementation',
		},
		executor: 'deterministic',
		implemented: true,
		evidence: '',
		referenceAssets: [],
	}
}

function image(results: NonNullable<CheckImage['results']>, scenarioKey = 'quick'): CheckImage {
	return {
		id: 'image-1',
		url: 'blob:test',
		name: 'test.png',
		file: {} as File,
		scenarioKey,
		status: 'completed',
		results,
	}
}

function result(key: string, status: CheckResult['rawResult']['status']): CheckResult {
	return {
		rule: { key, title: key, executor: 'deterministic' },
		checker: { key, type: 'algorithm' },
		rawResult: { status, fulfillment: null, detail: status },
		message: status,
	}
}

function heuristicResult(
	key: string,
	status: 'pass' | 'fail' | 'needs_review',
	count: number,
): CheckResult {
	return {
		rule: { key, title: key, executor: 'heuristic' },
		checker: { key: 'ai', type: 'ai' },
		rawResult: {
			status,
			fulfillment: null,
			summary: {
				total: status === 'pass' ? count : count + 1,
				satisfied: status === 'pass' ? count : 1,
				failed: status === 'fail' ? count : 0,
				uncertain: status === 'needs_review' ? count : 0,
			},
		},
	}
}
