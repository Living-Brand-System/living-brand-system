/**
 * AI 사용량의 분류 축 — **이 파일이 정본이다.**
 *
 * 🔴 컬렉션의 `options`도, 화면의 라벨도 여기서 읽는다. 기능·스튜디오가 늘어날 때 고칠 자리를
 *    하나로 두기 위한 것이다 — 예전에는 컬렉션 enum과 화면의 `Record` 두 곳에 같은 목록이
 *    있어서, 하나를 더하면 다른 쪽이 조용히 낡았다.
 * 🔴 타입도 여기서 파생한다(`payload-types`에서 읽지 않는다). 방향이 반대가 되면 컬렉션이
 *    정본이 되어 화면이 다시 목록을 베껴 적게 된다.
 * 🔑 **모델은 여기 없다.** 모델 식별자는 provider가 정하고 수시로 늘어나므로 열거하지 않는다 —
 *    자유 문자열로 저장하고 화면은 받은 값을 그대로 찍는다.
 */

export interface AiUsageOption<Value extends string> {
	value: Value
	label: string
}

/** AI를 호출한 기능. 늘어나면 여기에만 추가하고 마이그레이션을 만든다. */
export const AI_USAGE_FEATURES = [
	{ label: '이미지 생성', value: 'image-generation' },
	{ label: '이미지 검수', value: 'asset-check' },
	{ label: '에이전트 대화', value: 'agent-chat' },
] as const satisfies readonly AiUsageOption<string>[]

/** 호출이 들어온 스튜디오 화면. 사용량 표가 이 순서로 행을 세운다. */
export const AI_USAGE_STUDIOS = [
	{ label: '이미지', value: 'image' },
	{ label: '그래픽', value: 'graphic' },
	{ label: '그래프', value: 'graph' },
	{ label: '템플릿', value: 'template' },
	{ label: '검수', value: 'review' },
	{ label: '자산', value: 'assets' },
	{ label: 'MCP', value: 'mcp' },
] as const satisfies readonly AiUsageOption<string>[]

export type AiUsageFeature = (typeof AI_USAGE_FEATURES)[number]['value']
export type AiUsageStudio = (typeof AI_USAGE_STUDIOS)[number]['value']

/** 스튜디오 밖에서 온 호출(admin 미리보기·전역 헤더 챗)을 표에서 부르는 이름. */
export const AI_USAGE_OUTSIDE_STUDIO_LABEL = '스튜디오 밖'

function labelOf(options: readonly AiUsageOption<string>[], value: string): string {
	// 🔴 모르는 값이면 원문을 돌려준다. 배포보다 데이터가 앞설 수 있고(먼저 들어온 새 기능),
	//    그때 화면이 빈칸을 그리면 사용량이 사라진 것처럼 보인다.
	return options.find((option) => option.value === value)?.label ?? value
}

export function aiUsageFeatureLabel(value: string): string {
	return labelOf(AI_USAGE_FEATURES, value)
}

export function aiUsageStudioLabel(value: string | null): string {
	return value === null ? AI_USAGE_OUTSIDE_STUDIO_LABEL : labelOf(AI_USAGE_STUDIOS, value)
}

/**
 * 표를 접는 축. 🔴 화면이 이 배열을 렌더하므로 축 목록을 JSX에 박지 않는다 — 기능·스튜디오가
 *    늘어나듯 축도 늘어날 수 있고, 두 군데에 적으면 한쪽이 조용히 낡는다(그래서 카탈로그가 있다).
 * 🔑 **날짜는 축이 아니다.** 날짜는 다른 축과 배타로 고르는 것이 아니라 언제나 켜져 있는
 *    시간 분포다 — 화면에서는 축 세그먼트가 아니라 상시 일자 스트립이 맡는다.
 */
export const AI_USAGE_AXES = [
	{ label: '계정', value: 'user' },
	{ label: '기능', value: 'feature' },
	{ label: '스튜디오', value: 'studio' },
	{ label: '모델', value: 'model' },
] as const satisfies readonly AiUsageOption<string>[]

export type AiUsageAxis = (typeof AI_USAGE_AXES)[number]['value']

/**
 * 일자 버킷을 자르는 기준 시간대.
 *
 * 🔴 생략하면 Postgres 세션 TZ(대개 UTC)를 따라가 「오늘」이 하루 밀린다 — 이 리포가 실제로
 *    겪은 사고다. 서버 컴포넌트라 「보는 사람의 로컬」을 쓸 수 없으므로 존을 상수로 못박아
 *    결정론으로 만든다. 팀이 한국에 있어 Asia/Seoul이고, 바꾸려면 여기 한 곳만 고친다.
 */
export const AI_USAGE_TIME_ZONE = 'Asia/Seoul'

/** 기간 프리셋. 값은 일수이고 null은 전 기간이다. */
export const AI_USAGE_PERIODS = [
	{ days: 7, label: '7일', value: '7' },
	{ days: 30, label: '30일', value: '30' },
	{ days: null, label: '전체', value: 'all' },
] as const

export type AiUsagePeriod = (typeof AI_USAGE_PERIODS)[number]['value']

/** 모델 축만 상한을 둔다 — 계정·기능·스튜디오는 한 화면에 들어가고, 자르면 「잘렸나」로 읽힌다. */
export const AI_USAGE_MODEL_ROW_LIMIT = 25

export function aiUsageAxisLabel(value: string): string {
	return labelOf(AI_USAGE_AXES, value)
}
