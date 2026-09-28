import type { AiUsageBreakdownRow } from './ai-usage-breakdown'
import {
	AI_USAGE_FEATURES,
	AI_USAGE_MODEL_ROW_LIMIT,
	AI_USAGE_STUDIOS,
	type AiUsageAxis,
	aiUsageFeatureLabel,
	aiUsageStudioLabel,
} from './ai-usage-catalog'

export interface AiUsageKpi {
	callCount: number
	inputTokens: number
	outputTokens: number
	totalTokens: number
	cacheReadInputTokens: number
	reasoningTokens: number
}

export interface AiUsageAxisRow {
	/** 필터 링크에 실리는 값. null은 스튜디오 밖처럼 「값이 없음」이 뜻을 갖는 자리다. */
	key: string | null
	label: string
	callCount: number
	inputTokens: number
	outputTokens: number
	totalTokens: number
	/** 0~1. 표 셀 안 막대의 폭이고, 총계가 0이면 0이다. */
	share: number
}

export interface AiUsageDay {
	dayKey: string
	totalTokens: number
	/** 0~1. 그 기간 최대 일자 대비. */
	share: number
}

export interface AiUsageFilters {
	user?: string
	feature?: string
	studio?: string
	model?: string
}

export interface AiUsageFold {
	kpi: AiUsageKpi
	/** 직전 같은 길이 구간. 기간이 「전체」면 비교 대상이 없어 null이다. */
	previousTotalTokens: number | null
	daily: AiUsageDay[]
	rows: AiUsageAxisRow[]
	/** 상한에 잘려 안 보이는 행 수. 0이면 전량이 보인다. */
	hiddenRowCount: number
	/** 🔴 자르기 전 전량의 합. 표 바닥에 이것을 적는다. */
	footerTotal: AiUsageKpi
}

const EMPTY: AiUsageKpi = {
	cacheReadInputTokens: 0,
	callCount: 0,
	inputTokens: 0,
	outputTokens: 0,
	reasoningTokens: 0,
	totalTokens: 0,
}

function add(into: AiUsageKpi, row: AiUsageBreakdownRow): AiUsageKpi {
	return {
		cacheReadInputTokens: into.cacheReadInputTokens + row.cacheReadInputTokens,
		callCount: into.callCount + row.callCount,
		inputTokens: into.inputTokens + row.inputTokens,
		outputTokens: into.outputTokens + row.outputTokens,
		reasoningTokens: into.reasoningTokens + row.reasoningTokens,
		totalTokens: into.totalTokens + row.totalTokens,
	}
}

/** 문자열 날짜에서 n일 뺀다 — Date 연산을 피해 타임존이 끼어들 자리를 없앤다. */
function shiftDayKey(dayKey: string, days: number): string {
	const [year, month, day] = dayKey.split('-').map(Number)
	if (year === undefined || month === undefined || day === undefined) return dayKey
	const shifted = new Date(Date.UTC(year, month - 1, day - days))
	return shifted.toISOString().slice(0, 10)
}

function matchesFilters(row: AiUsageBreakdownRow, filters: AiUsageFilters): boolean {
	if (filters.user !== undefined && userKeyOf(row) !== filters.user) return false
	if (filters.feature !== undefined && row.feature !== filters.feature) return false
	// 스튜디오 밖은 'none'이라는 값으로 고른다 — null을 URL에 실을 수 없기 때문이다.
	if (filters.studio !== undefined && (row.studio ?? 'none') !== filters.studio) return false
	if (filters.model !== undefined && row.model !== filters.model) return false
	return true
}

/** 계정이 삭제된 행도 한 칸으로 모은다 — 토큰은 남았으므로 집계에서 사라지면 안 된다. */
function userKeyOf(row: AiUsageBreakdownRow): string {
	return row.userId == null ? 'deleted' : String(row.userId)
}

function axisKeyOf(row: AiUsageBreakdownRow, axis: AiUsageAxis): string | null {
	if (axis === 'user') return userKeyOf(row)
	if (axis === 'feature') return row.feature
	if (axis === 'model') return row.model
	return row.studio
}

function axisLabelOf(row: AiUsageBreakdownRow, axis: AiUsageAxis): string {
	if (axis === 'user') return row.userEmail ?? '삭제된 계정'
	if (axis === 'feature') return aiUsageFeatureLabel(row.feature)
	if (axis === 'model') return row.model
	return aiUsageStudioLabel(row.studio)
}

/**
 * 카탈로그가 있는 축은 안 쓴 값도 0행으로 세운다 — 행이 없는 것과 0을 쓴 것은 보는 사람에게
 * 다른 말이고, 전자는 집계가 고장 난 것처럼 읽힌다(사용자 지시, 2026-09-22).
 * 계정·모델은 열거할 수 없으므로 0행을 세울 수 없다.
 */
function catalogRowsFor(axis: AiUsageAxis): AiUsageAxisRow[] {
	const blank = { callCount: 0, inputTokens: 0, outputTokens: 0, share: 0, totalTokens: 0 }
	if (axis === 'feature') {
		return AI_USAGE_FEATURES.map((option) => ({
			key: option.value,
			label: option.label,
			...blank,
		}))
	}
	if (axis === 'studio') {
		return AI_USAGE_STUDIOS.map((option) => ({
			key: option.value,
			label: option.label,
			...blank,
		}))
	}
	return []
}

/**
 * 최소 알갱이를 화면이 그릴 세 덩어리(KPI · 일자 분포 · 축별 표)로 접는다.
 *
 * 🔴 **KPI와 바닥 총계는 접기 전 전체 집합에서 나온다.** 보이는 행을 더해서 만들면 상한에
 *    잘리거나 정렬이 바뀌는 순간 조용히 틀린 숫자가 된다 — 지금 화면이 정확히 그 모양이었다.
 * 🔑 축을 바꿔도 총계가 변하지 않는다. 어느 축이든 같은 집합의 분할이기 때문이다.
 */
export function foldAiUsage(
	rows: readonly AiUsageBreakdownRow[],
	input: {
		axis: AiUsageAxis
		days: number | null
		todayKey: string
		filters?: AiUsageFilters
		showAllRows?: boolean
	},
): AiUsageFold {
	const filters = input.filters ?? {}
	const since = input.days === null ? null : shiftDayKey(input.todayKey, input.days - 1)
	const previousSince =
		input.days === null ? null : shiftDayKey(input.todayKey, input.days * 2 - 1)

	const filtered = rows.filter((row) => matchesFilters(row, filters))
	const inPeriod = filtered.filter((row) => since === null || row.dayKey >= since)

	let kpi = EMPTY
	let previousTotal = 0
	const dayTotals = new Map<string, number>()
	const grouped = new Map<string | null, AiUsageAxisRow>()

	for (const row of filtered) {
		if (since !== null && row.dayKey < since) {
			// 직전 같은 길이 구간만 비교에 쓴다. 그보다 앞은 어디에도 안 들어간다.
			if (previousSince !== null && row.dayKey >= previousSince)
				previousTotal += row.totalTokens
			continue
		}
		kpi = add(kpi, row)
		dayTotals.set(row.dayKey, (dayTotals.get(row.dayKey) ?? 0) + row.totalTokens)

		const key = axisKeyOf(row, input.axis)
		const current = grouped.get(key) ?? {
			callCount: 0,
			inputTokens: 0,
			key,
			label: axisLabelOf(row, input.axis),
			outputTokens: 0,
			share: 0,
			totalTokens: 0,
		}
		grouped.set(key, {
			...current,
			callCount: current.callCount + row.callCount,
			inputTokens: current.inputTokens + row.inputTokens,
			outputTokens: current.outputTokens + row.outputTokens,
			totalTokens: current.totalTokens + row.totalTokens,
		})
	}

	for (const blank of catalogRowsFor(input.axis)) {
		if (!grouped.has(blank.key)) grouped.set(blank.key, blank)
	}

	const all = [...grouped.values()]
		.map((row) => ({
			...row,
			share: kpi.totalTokens > 0 ? row.totalTokens / kpi.totalTokens : 0,
		}))
		// 쓴 것을 먼저 — 0인 줄이 중간에 끼면 표가 끊겨 읽힌다.
		.sort((a, b) => b.totalTokens - a.totalTokens || a.label.localeCompare(b.label, 'ko-KR'))

	// 🔴 모델만 상한을 둔다. 계정·기능·스튜디오는 한 화면에 들어가고, 자르면 「잘렸나」로 읽힌다.
	const capped =
		input.axis === 'model' && !input.showAllRows ? all.slice(0, AI_USAGE_MODEL_ROW_LIMIT) : all

	const maxDay = Math.max(0, ...dayTotals.values())
	const daily = [...dayTotals.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([dayKey, totalTokens]) => ({
			dayKey,
			share: maxDay > 0 ? totalTokens / maxDay : 0,
			totalTokens,
		}))

	return {
		daily,
		footerTotal: inPeriod.reduce(add, EMPTY),
		hiddenRowCount: all.length - capped.length,
		kpi,
		previousTotalTokens: input.days === null ? null : previousTotal,
		rows: capped,
	}
}
