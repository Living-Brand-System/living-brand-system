import type { InfographicChartType } from './model'

/**
 * 12종이 **한 포맷**을 쓴다 — 줄이 항목이고, 칸은 탭이나 쉼표로 가른다.
 *
 * ```
 * 라벨	값
 * 라벨	값1	값2   ← 칸이 더 있으면 계열이 여럿이다(선·영역만 쓴다)
 * ```
 *
 * 🔑 차트마다 포맷을 따로 두지 않은 이유: 표현을 바꿀 때마다 데이터를 다시 적어야 하면
 *    「같은 데이터를 다르게 본다」가 성립하지 않는다. 남는 칸은 그 표현이 안 쓸 뿐이다.
 * 🔑 첫 줄의 둘째 칸부터가 숫자가 아니면 머리글로 읽는다 — 엑셀에서 복사하면 대개 그 모양이다.
 */
export type ChartData = {
	/** 계열 이름. 머리글이 없으면 비어 있다. */
	series: readonly string[]
	rows: readonly { label: string; values: readonly number[] }[]
}

export const EMPTY_CHART_DATA: ChartData = { series: [], rows: [] }

function splitCells(line: string): string[] {
	return line.split(line.includes('\t') ? '\t' : ',').map((cell) => cell.trim())
}

function toNumber(cell: string): number | null {
	// 붙여넣은 값에는 천 단위 쉼표 대신 %·공백이 섞인다. 쉼표는 이미 칸을 가르는 데 쓰였다.
	const parsed = Number(cell.replace(/%/g, '').trim())
	return cell.trim() !== '' && Number.isFinite(parsed) ? parsed : null
}

export function parseChartData(text: string): ChartData {
	const lines = text
		.split('\n')
		.map((line) => line.trimEnd())
		.filter((line) => line.trim() !== '')
	if (lines.length === 0) return EMPTY_CHART_DATA

	const first = splitCells(lines[0])
	/**
	 * 머리글인가. 두 신호 중 하나면 머리글이다.
	 * - 첫 칸이 비었다 — 표를 복사하면 좌상단이 비는 것이 관례다.
	 * - 둘째 칸부터가 숫자가 아니다.
	 * 🔴 두 번째만으로는 부족하다. `09`·`2024` 같은 계열 이름은 숫자로 읽힌다(실제로 밟았다).
	 *    첫 칸을 채운 머리글(`구분	09	08`)은 데이터로 읽히지만, 그때는 첫 칸을 비우면 된다.
	 */
	const isHeader =
		first.length > 1 &&
		(first[0] === '' || first.slice(1).every((cell) => toNumber(cell) === null))
	const series = isHeader ? first.slice(1) : []

	const rows = lines.slice(isHeader ? 1 : 0).flatMap((line) => {
		const cells = splitCells(line)
		const values = cells.slice(1).map(toNumber)
		// 값이 하나도 없는 줄은 항목이 아니다 — 주석이나 빈 머리글로 보고 버린다.
		if (values.length === 0 || values.every((value) => value === null)) return []
		return [{ label: cells[0], values: values.map((value) => value ?? 0) }]
	})

	return { series, rows }
}

/** 첫 계열만 쓰는 표현(대부분)이 보는 값. */
export function firstColumn(data: ChartData): number[] {
	return data.rows.map((row) => row.values[0] ?? 0)
}

/**
 * 표현마다 「이상적인 데이터」. 표현을 고르면 이 값이 기본값이 되고, 초기화가 되돌리는 자리도 여기다.
 *
 * 🔑 12종이 **서로 다른 데이터**를 갖는다. 같은 값을 돌려 쓰면 「이 표현이 무엇에 쓰이는가」를
 *    샘플이 말해 주지 못하고, 조각 수·분포가 같아 표현끼리 구별도 안 된다.
 * 🔴 라벨은 회사·제품을 특정하지 않는 일반 명사다. 그럴듯한 실적처럼 읽히면 샘플이 아니라
 *    자료가 되어 버린다.
 */
/**
 * 한 해 365일을 `YYYY-MM-DD\t값`으로 편다. 캘린더 히트맵의 샘플이다.
 *
 * 🔴 ECharts 예제는 `Math.random()`을 쓰지만 여기서는 못 쓴다 — 장면은 순수 함수라야
 *    미리보기와 내보내기가 같은 것을 본다. 값은 계절 곡선 + 요일 주기 + 결정론 잡음이다.
 * 🔑 값은 백분율이다. 이 런타임은 수치 표기가 하나뿐이라(`valueText`), 다른 단위를 섞으면
 *    표현끼리 look이 갈린다.
 */
function calendarYear(year: number): string {
	const day = 24 * 60 * 60 * 1000
	const start = Date.UTC(year, 0, 1)
	const end = Date.UTC(year + 1, 0, 1)
	const lines: string[] = []
	for (let time = start, index = 0; time < end; time += day, index += 1) {
		const date = new Date(time)
		// 여름에 높고 겨울에 낮은 계절 곡선 + 주말에 낮아지는 요일 주기 + 흔들림.
		const season = 50 + 28 * Math.sin(((index - 100) / 365) * Math.PI * 2)
		const weekday = [0, 6].includes(date.getUTCDay()) ? -18 : 4
		const jitter = ((Math.sin(index * 12.9898) * 43758.5453) % 1) * 14
		const value = Math.max(0, Math.min(100, Math.round(season + weekday + jitter)))
		lines.push(`${date.toISOString().slice(0, 10)}\t${value}`)
	}
	return lines.join('\n')
}

export const INFOGRAPHIC_SAMPLE_DATA: Record<InfographicChartType, string> = {
	// 구성비 — 조각이 많아도 읽히는 표현이라 다섯을 싣는다.
	pie: '아시아\t34\n유럽\t33\n북미\t12\n중동\t12\n기타\t9',
	// 같은 구성비지만 가운데가 비어 조각 수가 적을 때 낫다.
	donut: '직판\t34\n대리점\t24\n온라인\t18\n총판\t13\n기타\t11',
	// 둘의 크기 비교. 셋 이상이면 버블 클러스터가 맞다.
	'proportional-circle': '달성\t67\n미달\t33',
	// 크기만 견주는 여러 항목 — 순서도 축도 없다.
	'bubble-cluster': '대형\t52\n중형\t31\n소형\t24\n특수\t18\n기타\t11',
	// 서로 독립인 값. 합이 100이 아니어도 된다.
	bar: '1월\t26\n2월\t49\n3월\t78\n4월\t58\n5월\t67',
	// 이름이 길어 세로 막대에 안 들어갈 때. 정본 밖(확장)이다.
	'bar-horizontal': '설계 부문\t72\n생산 부문\t58\n품질 부문\t45\n물류 부문\t31\n환경 부문\t24',
	// 각 항목이 자기 100%를 갖는다 — 달성률처럼 상한이 정해진 값.
	'bar-track': '생산\t54\n품질\t82\n납기\t27\n안전\t64\n환경\t38',
	// 같은 달성률을 가로로. 정본 밖(확장)이다.
	'bar-track-horizontal':
		'안전 관리\t88\n납기 준수\t64\n원가 절감\t41\n에너지 절감\t26\n재해 저감\t57',
	// 하나의 전체를 세로로 가른다.
	'stacked-column': '기타\t8\n경비\t19\n외주비\t14\n재료비\t47\n노무비\t12',
	// 하나의 전체를 가로로 가른다 — 조각이 적고 이름이 길 때.
	'stacked-bar': '연구\t12\n생산\t41\n품질\t17\n물류\t14\n관리\t16',
	// 시계열 여러 계열. 첫 칸이 비어 있어 둘째 칸부터 계열 이름이다.
	line: '\t매출\t영업이익\t수주\n2025.01\t3\t1.5\t0\n2025.03\t6\t3\t-1\n2025.05\t10\t5\t0.5\n2025.07\t7\t2.5\t-1.5\n2025.09\t3.5\t-0.5\t-2.5\n2025.11\t6\t2\t0\n2026.01\t8\t4\t2.5\n2026.03\t9\t5.5\t4',
	// 쌓아 올라가는 두 계열 — 값 자체보다 늘어나는 모양이 정보다.
	area: '\t누적\t기준\n1월\t0\t0\n2월\t9\t6\n3월\t18\t12\n4월\t38\t27\n5월\t62\t45\n6월\t78\t58\n7월\t90\t68\n8월\t96\t73\n9월\t100\t76',
	// 포함 관계 — 큰 것 안에 작은 것이 든다.
	'nested-circle': '전체\t100\n대상\t72\n유효\t45\n핵심\t20',
	// 같은 포함 관계를 중심 맞춰서. 정본 밖(확장)이다.
	'concentric-circle': '전사\t100\n본부\t74\n사업부\t48\n팀\t24',
	// 면적으로 규모를 견준다. 자리가 셋뿐이다.
	'nested-square': '국내\t54\n아시아\t82\n기타\t32',
	// ── 복합 ────────────────────────────────────────────────────────────────
	// 🔑 복합 표현의 샘플은 **크다**. 작은 표로는 이 표현들이 무엇에 쓰이는지 안 보이고,
	//    도형 몇 개짜리 표현과 구별도 되지 않는다.
	// 🔴 넷이 **같은 모양**의 표를 먹는다 — 첫 줄이 열 이름, 줄마다 이름 하나와 값 여럿.
	heatmap:
		'\t1월\t2월\t3월\t4월\t5월\t6월\t7월\t8월\t9월\t10월\t11월\t12월\n설계\t18\t22\t31\t44\t52\t61\t73\t78\t64\t49\t33\t21\n구매\t24\t28\t36\t41\t55\t63\t70\t72\t61\t47\t35\t26\n생산\t31\t35\t42\t58\t66\t74\t85\t88\t72\t58\t44\t33\n품질\t12\t16\t21\t29\t38\t45\t52\t56\t44\t31\t22\t15\n물류\t27\t30\t38\t47\t59\t68\t76\t80\t66\t52\t38\t28\n안전\t9\t11\t15\t22\t28\t34\t41\t45\t33\t24\t17\t12\n환경\t15\t19\t25\t33\t41\t49\t57\t61\t48\t36\t26\t18',
	'stacked-area':
		'\t조선\t해양\t엔진\t건설기계\n2025.01\t18\t12\t9\t6\n2025.02\t19\t13\t9\t6\n2025.03\t21\t14\t10\t7\n2025.04\t24\t15\t10\t7\n2025.05\t26\t17\t11\t8\n2025.06\t29\t18\t12\t8\n2025.07\t31\t20\t12\t9\n2025.08\t33\t21\t13\t9\n2025.09\t36\t23\t14\t10\n2025.10\t38\t24\t14\t10\n2025.11\t41\t26\t15\t11\n2025.12\t44\t28\t16\t12',
	'stacked-bar-normalized':
		'\t재료비\t노무비\t경비\t기타\n조선\t52\t24\t16\t8\n해양\t46\t28\t18\t8\n엔진\t58\t20\t14\t8\n건설기계\t44\t30\t18\t8\n에너지\t50\t22\t20\t8\n로보틱스\t38\t34\t20\t8\n전기전자\t41\t27\t24\t8\n서비스\t33\t38\t21\t8',
	// 한 해를 하루씩 — 이 런타임에서 가장 큰 데이터다(365칸).
	'calendar-heatmap': calendarYear(2026),
	'grouped-bar':
		'\t2024\t2025\t2026\n조선\t62\t71\t83\n해양\t48\t55\t61\n엔진\t57\t64\t72\n건설기계\t41\t46\t54\n에너지\t35\t44\t58\n로보틱스\t22\t31\t45\n전기전자\t39\t49\t60\n서비스\t28\t36\t47',
}
