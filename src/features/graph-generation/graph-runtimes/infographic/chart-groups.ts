/**
 * 표현이 서는 **묶음**.
 *
 * 🔴 데이터 성격(`single`·`bounded`·`descending`)으로 나누던 분류를 걷어냈다 — 같은 데이터가
 *    어느 쪽에도 들어갈 수 있어서 창작자가 고르는 데 도움이 되지 않았고, 열다섯 표현이
 *    네 조각으로 흩어져 무엇이 있는지도 안 보였다.
 * 🔑 지금 가르는 것은 **표현의 복잡도** 하나뿐이다. 기본은 도형 한둘로 서는 것이고, 복합은
 *    정보량이 많아 모양이 데이터에 묶이는 것이다 — 후자는 창작자가 흔들 자리가 적어
 *    오히려 통일성이 지켜진다.
 * 🔴 여기 없는 세 번째 묶음을 즉흥으로 만들지 말 것.
 */
export const INFOGRAPHIC_CHART_GROUPS = ['basic', 'complex'] as const

export type InfographicChartGroup = (typeof INFOGRAPHIC_CHART_GROUPS)[number]

/** 묶음 제목. 🔑 묶음이 하나뿐이면 화면은 제목을 그리지 않는다(`preview-chips.tsx`). */
export const INFOGRAPHIC_CHART_GROUP_LABELS: Record<InfographicChartGroup, string> = {
	basic: '기본',
	complex: '복합',
}

/**
 * 표현이 어디서 왔나.
 * - `canon` — 가이드라인 B.11 INFOGRAPHIC 도판에 실린 열두 가지.
 * - `extended` — 정본에 없지만 같은 자리를 메우려고 **우리가 더한 것**.
 *
 * 🔴 둘을 섞어 적지 않는다. 브랜드팀이 「이건 규정인가」를 물었을 때 답이 코드에 있어야 한다.
 */
export type InfographicChartSource = 'canon' | 'extended'

export const EXTENDED_CHART_SUFFIX = ' +'
