import {
	AI_USAGE_AXES,
	AI_USAGE_PERIODS,
	type AiUsageAxis,
	type AiUsagePeriod,
} from './ai-usage-catalog'
import type { AiUsageFilters } from './ai-usage-fold'

/**
 * 사용량 화면의 상태 계약 — **전부 URL에 있다.**
 *
 * 🔑 클라이언트 state가 0이라서 표·KPI·스트립이 전원 서버 컴포넌트로 남고, 링크를 그대로
 *    공유하면 같은 화면이 열린다. 이 파일이 URL의 유일한 소유자다.
 * 🔴 모르는 값은 조용히 기본값으로 떨어뜨린다 — 주소창은 사용자가 손댈 수 있는 입력이라
 *    믿고 쓰면 안 된다.
 */
export interface AiUsageQuery {
	axis: AiUsageAxis
	period: AiUsagePeriod
	days: number | null
	filters: AiUsageFilters
	showAllRows: boolean
}

/** 기본 기간. 운영에서 가장 자주 보는 창을 기본으로 둔다. */
const DEFAULT_PERIOD: AiUsagePeriod = '30'
const DEFAULT_AXIS: AiUsageAxis = 'user'

const FILTER_KEYS = ['user', 'feature', 'studio', 'model'] as const

type RawParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value
}

export function parseAiUsageQuery(params: RawParams): AiUsageQuery {
	const axisRaw = first(params.by)
	const axis = AI_USAGE_AXES.some((option) => option.value === axisRaw)
		? (axisRaw as AiUsageAxis)
		: DEFAULT_AXIS

	const periodRaw = first(params.days)
	const period = AI_USAGE_PERIODS.some((option) => option.value === periodRaw)
		? (periodRaw as AiUsagePeriod)
		: DEFAULT_PERIOD
	const days = AI_USAGE_PERIODS.find((option) => option.value === period)?.days ?? null

	const filters: AiUsageFilters = {}
	for (const key of FILTER_KEYS) {
		const value = first(params[key])
		// 빈 문자열은 칩이 아니다 — 지운 흔적이 주소에 남는 것을 거른다.
		if (value !== undefined && value !== '') filters[key] = value
	}

	return { axis, days, filters, period, showAllRows: first(params.limit) === 'all' }
}

function toSearch(query: AiUsageQuery): string {
	const params = new URLSearchParams()
	if (query.period !== DEFAULT_PERIOD) params.set('days', query.period)
	if (query.axis !== DEFAULT_AXIS) params.set('by', query.axis)
	for (const key of FILTER_KEYS) {
		const value = query.filters[key]
		if (value !== undefined) params.set(key, value)
	}
	if (query.showAllRows) params.set('limit', 'all')
	const search = params.toString()
	// 🔴 빈 문자열을 돌려주면 안 된다. `href=""`는 브라우저가 **지금 주소(쿼리 포함)**로 해석해서,
	//    기본값으로 되돌리는 링크가 아무 일도 하지 않는다 — 기본 기간(30일)과 기본 축이 정확히
	//    그 자리였다. `?`는 「이 경로, 쿼리 없음」이라 기본값으로 제대로 되돌린다.
	return search === '' ? '?' : `?${search}`
}

/** 현재 상태에서 한 곳만 바꾼 주소. 나머지 상태는 전부 따라간다. */
export function aiUsageHref(query: AiUsageQuery, patch: Partial<AiUsageQuery>): string {
	return toSearch({ ...query, ...patch })
}

export function aiUsageAxisHref(query: AiUsageQuery, axis: AiUsageAxis): string {
	// 🔴 축을 바꾸면 「더 보기」는 버린다 — 모델 축에만 있는 상태라 들고 갈 뜻이 없다.
	return toSearch({ ...query, axis, showAllRows: false })
}

export function aiUsagePeriodHref(query: AiUsageQuery, period: AiUsagePeriod): string {
	const days = AI_USAGE_PERIODS.find((option) => option.value === period)?.days ?? null
	return toSearch({ ...query, days, period })
}

/**
 * 표의 값을 눌렀을 때 붙는 칩. 🔴 칩은 축을 넘나든다 — 계정에서 한 사람을 찍고 모델 축으로
 * 넘기면 그 사람의 모델 내역이 나온다. 축 4개를 화면 16개로 펴지 않고 교차 조회를 얻는 자리다.
 */
export function aiUsageFilterHref(
	query: AiUsageQuery,
	key: keyof AiUsageFilters,
	value: string | null,
): string {
	// null(스튜디오 밖)은 URL에 실을 수 없어 'none'이라는 값으로 고른다.
	return toSearch({
		...query,
		filters: { ...query.filters, [key]: value ?? 'none' },
		showAllRows: false,
	})
}

export function aiUsageClearFilterHref(query: AiUsageQuery, key: keyof AiUsageFilters): string {
	const filters = { ...query.filters }
	delete filters[key]
	return toSearch({ ...query, filters })
}

export function aiUsageClearAllFiltersHref(query: AiUsageQuery): string {
	return toSearch({ ...query, filters: {} })
}
