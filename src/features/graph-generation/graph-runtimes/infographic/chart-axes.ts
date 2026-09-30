/**
 * 표현마다 다른 **형태 축**.
 *
 * 🔑 축을 표현 수만큼 만들지 않는다. 「막대 폭」·「도넛 내부 반지름」·「띠 두께」는 이름만 다를 뿐
 *    전부 **두껍게/얇게**이고, 「막대 사이」·「원 사이」·「겹침 정도」는 전부 **벌리기/붙이기**다.
 *    네 축이면 열다섯 표현을 덮는다 — 축을 늘리면 창작자가 표현마다 다른 이름을 외워야 한다.
 * 🔑 회전만 종류가 다르다 — 두께·간격·곡률은 **모양**을 바꾸지만 회전은 모양을 그대로 두고
 *    **어느 쪽을 보게 할지**만 정한다. 기준점이 없는 표현(비례 원·버블 클러스터)에만 있다.
 * 🔴 값은 언제나 0~1이다. 그 값을 무엇으로 읽을지는 **표현이 정한다**(막대에서는 간격, 겹친
 *    원에서는 정렬). 계약에 실제 치수를 두면 판 크기가 바뀔 때마다 값이 무의미해진다.
 */
export const INFOGRAPHIC_AXES = ['thickness', 'spacing', 'curvature', 'rotation'] as const

export type InfographicAxis = (typeof INFOGRAPHIC_AXES)[number]

export const INFOGRAPHIC_AXIS_LABELS: Record<InfographicAxis, string> = {
	thickness: '두께',
	spacing: '간격',
	curvature: '곡률',
	rotation: '회전',
}

/** 표현이 쓰는 축. 여기 없는 축은 창작자 화면에서 잠긴다. */
export type ChartAxes = readonly InfographicAxis[]

/**
 * 🔑 **가운데가 정본이다.** 0.5일 때 각 표현은 디자이너 도판 그대로 그려지고, 0과 1이 그
 *    표현에서 뜻이 통하는 양 끝이다.
 * 🔴 회전만 양 끝이 만난다(정본 ±180°는 같은 각이다). 0과 1을 견주는 검사는 회전에서 통하지
 *    않으므로, 축이 살아 있는지 볼 때는 한 바퀴가 아닌 값끼리 견준다.
 * 🔴 표현마다 다른 기본값을 두지 않는 이유: control의 기본값은 계약에 하나뿐이고, 값이
 *    범위 안이면 표현을 바꿔도 그대로 남는다 — 파이에서 0으로 내린 간격이 막대로 옮겨 가
 *    막대가 딱 붙는다. 가운데를 정본으로 삼으면 어느 표현에서든 0.5가 「원래 모양」이다.
 */
export const INFOGRAPHIC_AXIS_RANGE = { min: 0, max: 1, step: 0.02 } as const
export const INFOGRAPHIC_AXIS_NEUTRAL = 0.5
