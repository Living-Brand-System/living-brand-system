import type { CheckResult } from '@/features/asset-check/checkers/types'
import type { CheckSection, RuntimeCheck } from '@/features/asset-check/domain/runtime-check'
import { filterRulesetByScenario } from '@/features/asset-check/scenarios'
import type { CheckImage } from '@/features/asset-check/types'
import { checkDisplayStatus } from '@/features/asset-check/utils/check-display-status'
import { formatCheckDetail } from '@/features/asset-check/utils/format-check-detail'
import { type CheckScenario, getCheckScenario } from '@/features/quality-rule/check-scenario'

export interface CheckReviewRow {
	check: RuntimeCheck
	rowId: string
	scenarioLabel: string | null
	appliesTo: string[]
	guidelineHref: string
	anchorId: string | null
	outcome?: CheckResult
	inProgress: boolean
	expandable: boolean
	detail: string | null
}

export interface CheckReviewSummary {
	pass: number
	ok: number
	fail: number
	advisory: number
	notApplicable: number
	pendingManualCheck: number
}

export interface CheckReviewView {
	rows: CheckReviewRow[]
	summary: CheckReviewSummary
}

type MutableCheckRow = CheckReviewRow & { appliesToSet: Set<string> }

/**
 * 검수 리뷰 화면 view model 생성 경계.
 * ruleset/result 조회와 외부 I/O는 호출자가 소유하고, 이 함수는 화면 표시용 순수 계산만 담당한다.
 */
export function buildCheckReviewView({
	sections,
	scenarios,
	scenarioKey,
	selected,
	showFailOnly,
}: {
	sections: CheckSection[]
	scenarios: CheckScenario[]
	scenarioKey: string
	selected: CheckImage | null
	showFailOnly: boolean
}): CheckReviewView {
	if (scenarios.length === 0) return { rows: [], summary: buildSummary([], selected?.results) }
	const results = selected?.results
	const reviewScenarioKey = selected?.scenarioKey ?? scenarioKey
	const scenario = getCheckScenario(scenarios, reviewScenarioKey)
	const visibleSections = filterRulesetByScenario(sections, scenario)
	const allRows = buildRows({ visibleSections, selected, scenario })
	const summary = buildSummary(allRows, results)
	const rows =
		showFailOnly && results
			? allRows.filter((row) => row.outcome?.rawResult.status === 'fail')
			: allRows

	return { rows, summary }
}

function buildSummary(rows: CheckReviewRow[], results: CheckImage['results']): CheckReviewSummary {
	const summary = {
		pass: 0,
		ok: 0,
		fail: 0,
		advisory: 0,
		notApplicable: 0,
		pendingManualCheck: 0,
	}
	if (!results) return summary

	for (const row of rows) {
		const status = row.outcome ? checkDisplayStatus(row.outcome.rawResult) : undefined
		if (status === 'pass') summary.pass++
		else if (status === 'ok') summary.ok++
		else if (status === 'fail') summary.fail++
		else if (status === 'advisory') summary.advisory++
		else if (status === 'not_applicable') summary.notApplicable++
		else summary.pendingManualCheck++
	}

	return summary
}

function buildRows({
	visibleSections,
	selected,
	scenario,
}: {
	visibleSections: CheckSection[]
	selected: CheckImage | null
	scenario: CheckScenario
}): CheckReviewRow[] {
	const results = selected?.results
	const snapshotByKey = new Map(selected?.rulesetSnapshot?.map((check) => [check.key, check]))
	const pendingCheckKeys = new Set(selected?.pendingCheckKeys)
	const rowByCheckKey = new Map<string, MutableCheckRow>()

	for (const section of visibleSections) {
		for (const currentCheck of section.checks) {
			const check = snapshotByKey.get(currentCheck.key) ?? currentCheck
			const existing = rowByCheckKey.get(check.key)
			if (existing) {
				if (!existing.appliesToSet.has(section.title)) {
					existing.appliesToSet.add(section.title)
					existing.appliesTo.push(section.title)
				}
				continue
			}

			const outcome = results?.[check.key]
			if (!check.implemented) continue
			const inProgress =
				selected?.status === 'running' && (!outcome || pendingCheckKeys.has(check.key))

			const row = {
				check,
				rowId: `${scenario.key}:${check.key}`,
				scenarioLabel: null,
				appliesTo: [section.title],
				appliesToSet: new Set([section.title]),
				guidelineHref: toGuidelineHref(section),
				anchorId: null,
				outcome,
				inProgress,
				expandable: Boolean(outcome) && !inProgress,
				detail: inProgress ? '검사 중...' : outcome ? formatCheckDetail(outcome) : null,
			}
			rowByCheckKey.set(check.key, row)
		}
	}

	const orderedRows: CheckReviewRow[] = []
	for (const key of scenario.checkKeys) {
		const current = rowByCheckKey.get(key)
		if (!current) continue
		const { appliesToSet: _appliesToSet, ...row } = current
		const first = orderedRows.length === 0
		orderedRows.push({
			...row,
			scenarioLabel: first ? scenario.title : null,
			anchorId: first ? scenario.key : null,
		})
	}
	return orderedRows
}

function toGuidelineHref(section: CheckSection) {
	const chapterHref = `/guideline/${section.chapterSlug}`
	if (section.topicSlug === section.chapterSlug) return chapterHref

	const topicHref = `${chapterHref}/${section.topicSlug}`
	return section.slug === section.topicSlug ? topicHref : `${topicHref}#${section.slug}`
}
