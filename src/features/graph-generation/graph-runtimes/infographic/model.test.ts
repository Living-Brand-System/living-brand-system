import { describe, expect, it } from 'vitest'
import type { ControllerControlDefinition } from '@/modules/studio-controller/controller-definition'
import { INFOGRAPHIC_AXES } from './chart-axes'
import { INFOGRAPHIC_SAMPLE_DATA, parseChartData } from './chart-data'
import { INFOGRAPHIC_CHART_GROUP_LABELS, INFOGRAPHIC_CHART_GROUPS } from './chart-groups'
import manifest from './definition'
import model, {
	createInfographicScene,
	INFOGRAPHIC_CHART_TYPES,
	INFOGRAPHIC_DEFAULT_PALETTE,
	type InfographicChartType,
	type InfographicInput,
	toInfographicInput,
} from './model'
import { HD_INFOGRAPHIC_PALETTES, readableTextColor } from './palette'

const VIEWPORT = { width: 1080, height: 1080 }
/** 수치로 그려진 글자. 영역의 머릿수치(`+24%`)도 수치다. */
const VALUE_TEXT = /^[+-]?[\d.]+%$/
const chartTypes = INFOGRAPHIC_CHART_TYPES.map(({ id }) => id)

/**
 * 값 축을 가진 표현인가. 🔑 목록으로 박지 않고 **화면에서 읽는다** — 판이 그리는 점선 보조선이
 * 곧 값 축의 증거다. 목록으로 두면 새 표현이 조용히 빠진다.
 */
function hasValueAxis(chartType: InfographicChartType): boolean {
	return sceneFor(chartType).primitives.some(
		(primitive) => primitive.kind === 'line' && primitive.dash !== undefined,
	)
}

/** 형태 축의 가운데가 정본이다 — 어느 표현이든 0.5가 「원래 모양」이다. */
function axisDefaults(_chartType: InfographicChartType) {
	return { thickness: 0.5, spacing: 0.5, curvature: 0.5, rotation: 0.5 }
}

function sceneFor(chartType: InfographicChartType, overrides: Partial<InfographicInput> = {}) {
	return createInfographicScene(
		{
			chartType,
			palette: INFOGRAPHIC_DEFAULT_PALETTE,
			showNameLabels: true,
			showValueLabels: true,
			textScale: 1,
			...axisDefaults(chartType),
			data: parseChartData(INFOGRAPHIC_SAMPLE_DATA[chartType]),
			...overrides,
		},
		VIEWPORT,
	)
}

describe('infographic model', () => {
	it('모든 표현이 자기 샘플 데이터로 무언가를 그린다', () => {
		// 정본 12 + 확장 8. 수를 박아 두는 것은 표현이 조용히 늘거나 사라지는 것을 잡기 위해서다.
		expect(chartTypes).toHaveLength(20)
		expect(INFOGRAPHIC_CHART_TYPES.filter((chart) => chart.group === 'complex')).toHaveLength(5)
		expect(INFOGRAPHIC_CHART_TYPES.filter((chart) => chart.source === 'canon')).toHaveLength(12)
		for (const chartType of chartTypes) {
			const scene = sceneFor(chartType)
			expect(scene.primitives.length, chartType).toBeGreaterThan(0)
			expect(scene.width).toBe(VIEWPORT.width)
		}
	})

	it('데이터가 없으면 빈 판이다 — 입력 중인 상태라 오류가 아니다', () => {
		for (const chartType of chartTypes) {
			const scene = sceneFor(chartType, { data: parseChartData('') })
			expect(scene.primitives, chartType).toHaveLength(0)
		}
	})

	it('값 표시를 끄면 축 눈금 말고는 글자가 남지 않는다', () => {
		for (const chartType of chartTypes) {
			const texts = sceneFor(chartType, {
				showValueLabels: false,
				showNameLabels: false,
			}).primitives.filter((primitive) => primitive.kind === 'text')
			// 축 눈금은 값 라벨이 아니라 좌표계라 남는다.
			expect(texts.length === 0 || hasValueAxis(chartType), chartType).toBe(true)
		}
	})

	it('면 위의 글자는 대비가 갈리는 쪽으로만 정해진다', () => {
		expect(readableTextColor('#DCF5D2')).toBe('#00280A')
		expect(readableTextColor('#00280A')).toBe('#FFFFFF')
		expect(readableTextColor('#000A32')).toBe('#FFFFFF')
		expect(readableTextColor('#00AF41')).toBe('#FFFFFF')
	})

	it('정의된 컨트롤 밖의 값은 기본값으로 떨어진다', () => {
		const input = toInfographicInput({ chartType: '3d-pie', palette: 'rainbow' })
		expect(input.chartType).toBe('pie')
		expect(input.palette).toBe(INFOGRAPHIC_DEFAULT_PALETTE)
	})

	it('컨트롤 선택지가 코드가 그릴 수 있는 것과 같다', () => {
		const controls: ControllerControlDefinition[] = manifest.controller.groups.flatMap(
			(group) => [...group.controls],
		)
		const optionValues = (controlId: string) => {
			const control = controls.find((candidate) => candidate.id === controlId)
			return control?.kind === 'select' ? control.options.map((option) => option.value) : []
		}
		// 순서는 묶음이 정한다(아래 「묶음은 목록에서 흩어지지 않는다」) — 여기서는 빠짐만 본다.
		expect([...optionValues('chartType')].sort()).toEqual([...chartTypes].sort())
		expect(optionValues('palette')).toEqual(Object.keys(HD_INFOGRAPHIC_PALETTES))
	})

	it('표현을 고르면 그 표현의 샘플이 데이터 기본값이 된다 — 초기화가 되돌리는 자리다', () => {
		for (const chartType of chartTypes) {
			const data = INFOGRAPHIC_SAMPLE_DATA[chartType]
			const restrictions = model.getRestrictions({ data, chartType })
			expect(restrictions?.controls.find((control) => control.controlId === 'data')).toEqual({
				controlId: 'data',
				defaultValue: data,
			})
		}
	})

	it('표현은 데이터와 무관하게 언제나 전부 선다 — 숨기면 왜 사라졌는지 알 수 없다', () => {
		const controls = manifest.controller.groups.flatMap((group) => [...group.controls])
		const chartControl = controls.find((control) => control.id === 'chartType')
		expect(chartControl?.kind === 'select' && chartControl.options).toHaveLength(
			INFOGRAPHIC_CHART_TYPES.length,
		)
		// 어떤 데이터를 넣어도 선택지를 좁히지 않는다.
		for (const sample of [INFOGRAPHIC_SAMPLE_DATA.pie, INFOGRAPHIC_SAMPLE_DATA.line, '']) {
			const narrowed = model
				.getRestrictions({ data: sample })
				?.controls.find((control) => control.controlId === 'chartType')
			expect(narrowed).toBeUndefined()
		}
	})

	it('표현은 자기가 선언한 묶음에 서고, 묶음은 목록에서 흩어지지 않는다', () => {
		const controls = manifest.controller.groups.flatMap((group) => [...group.controls])
		const chartControl = controls.find((control) => control.id === 'chartType')
		const options = chartControl?.kind === 'select' ? chartControl.options : []
		for (const option of options) {
			const chart = INFOGRAPHIC_CHART_TYPES.find((candidate) => candidate.id === option.value)
			if (!chart) throw new Error(`표현을 찾을 수 없습니다: ${option.value}`)
			expect(option.group, option.value).toBe(INFOGRAPHIC_CHART_GROUP_LABELS[chart.group])
		}
		// 같은 묶음이 목록에서 흩어지면 화면에 같은 제목이 두 번 선다.
		const groups = options.map((option) => option.group)
		expect(new Set(groups).size).toBe(
			groups.filter((group, index) => index === 0 || group !== groups[index - 1]).length,
		)
	})

	/**
	 * 🔴 복합 묶음은 지금 비어 있다 — 화면은 묶음이 하나뿐이면 제목을 그리지 않으므로,
	 *    첫 복합 표현이 들어오는 순간 제목 둘이 함께 선다. 그 자리를 여기서 지킨다.
	 */
	it('묶음은 기본·복합 둘뿐이다', () => {
		expect([...INFOGRAPHIC_CHART_GROUPS]).toEqual(['basic', 'complex'])
		const declared = new Set(INFOGRAPHIC_CHART_TYPES.map((chart) => chart.group))
		for (const group of declared) expect(INFOGRAPHIC_CHART_GROUPS).toContain(group)
	})
})

describe('글자 크기', () => {
	/**
	 * 이름으로 그려진 글자만 — **수치가 아닌 것**이 곧 이름이다.
	 * 🔴 데이터의 라벨과 대조하면 안 된다: 캘린더 히트맵처럼 축 이름을 스스로 만드는 표현
	 *    (요일·달)에서는 하나도 안 잡혀 검사가 조용히 비어 버린다.
	 */
	function nameSizes(chartType: InfographicChartType) {
		return sceneFor(chartType)
			.primitives.filter(
				(primitive) => primitive.kind === 'text' && !VALUE_TEXT.test(primitive.text),
			)
			.map((primitive) => (primitive.kind === 'text' ? primitive.fontSize : 0))
	}

	it('이름은 한 차트 안에서 언제나 같은 크기다', () => {
		for (const chart of INFOGRAPHIC_CHART_TYPES) {
			if (!chart.usesNameLabels) continue
			const sizes = nameSizes(chart.id)
			expect(sizes.length, chart.id).toBeGreaterThan(1)
			expect(new Set(sizes.map((size) => size.toFixed(4))).size, chart.id).toBe(1)
		}
	})

	it('배율이 모든 글자에 곱해진다', () => {
		const at = (scale: number) =>
			sceneFor('bar', { textScale: scale })
				.primitives.filter((primitive) => primitive.kind === 'text')
				.map((primitive) => (primitive.kind === 'text' ? primitive.fontSize : 0))
		const single = at(1)
		const double = at(1.6)
		expect(double.every((size, index) => Math.abs(size - single[index] * 1.6) < 0.01)).toBe(
			true,
		)
	})

	it('이름을 쓰지 않는 표현에서는 이름 표시가 잠긴다', () => {
		const locked = model
			.getRestrictions({ data: INFOGRAPHIC_SAMPLE_DATA.pie, chartType: 'pie' })
			?.controls.find((control) => control.controlId === 'showNameLabels')
		expect(locked?.availability).toBe('disabled')
		const open = model
			.getRestrictions({
				data: INFOGRAPHIC_SAMPLE_DATA['stacked-bar'],
				chartType: 'stacked-bar',
			})
			?.controls.find((control) => control.controlId === 'showNameLabels')
		expect(open).toBeUndefined()
	})
})

describe('한 판의 글자 크기는 둘뿐이다', () => {
	/** 수치(`…%`)로 그려진 글자 크기만. */
	function valueSizes(chartType: InfographicChartType) {
		return sceneFor(chartType, { showNameLabels: false })
			.primitives.filter(
				(primitive) => primitive.kind === 'text' && VALUE_TEXT.test(primitive.text),
			)
			.map((primitive) =>
				primitive.kind === 'text' ? Number(primitive.fontSize.toFixed(4)) : 0,
			)
	}

	it('수치는 한 차트 안에서 언제나 같은 크기다', () => {
		for (const chart of INFOGRAPHIC_CHART_TYPES) {
			// 🔴 값 축이 있는 표현은 눈금도 `…%`라 글자만 보고는 수치와 가를 수 없다.
			//    그쪽은 아래 「둘을 넘지 않는다」가 본다.
			if (hasValueAxis(chart.id)) continue
			const sizes = valueSizes(chart.id)
			if (sizes.length < 2) continue
			expect(new Set(sizes).size, chart.id).toBe(1)
		}
	})

	/** 🔴 예외 없다. 복합 표현이 늘어도 여기 목록을 만들지 말 것 — 만드는 순간 규칙이 아니게 된다. */
	it('🔴 한 판에 서는 크기가 둘을 넘지 않는다 — 수치 하나, 이름 하나', () => {
		for (const chart of INFOGRAPHIC_CHART_TYPES) {
			const sizes = sceneFor(chart.id)
				.primitives.filter((primitive) => primitive.kind === 'text')
				.map((primitive) =>
					primitive.kind === 'text' ? primitive.fontSize.toFixed(4) : '',
				)
			expect(new Set(sizes).size, chart.id).toBeLessThanOrEqual(2)
		}
	})
})

describe('정본 도판과의 대조', () => {
	it('영역의 머릿수치는 카피가 아니라 데이터에서 나온다', () => {
		// 정본 도판의 「+24%」 = 마지막 시점에서 첫 계열이 마지막 계열보다 앞선 폭(100 − 76).
		const headline = sceneFor('area').primitives.find(
			(primitive) => primitive.kind === 'text' && primitive.text.startsWith('+'),
		)
		expect(headline?.kind === 'text' && headline.text).toBe('+24%')
		// 값을 바꾸면 따라 움직인다 — 박아 둔 문자열이 아니다.
		const moved = createInfographicScene(
			{
				chartType: 'area',
				palette: INFOGRAPHIC_DEFAULT_PALETTE,
				showNameLabels: true,
				showValueLabels: true,
				textScale: 1,
				...axisDefaults('area'),
				data: parseChartData('\tA\tB\n1\t0\t0\n2\t90\t50'),
			},
			VIEWPORT,
		).primitives.find(
			(primitive) => primitive.kind === 'text' && primitive.text.startsWith('+'),
		)
		expect(moved?.kind === 'text' && moved.text).toBe('+40%')
	})

	it('선 차트의 보조선은 점선이다 — 데이터 선과 층위가 다르다', () => {
		const gridlines = sceneFor('line').primitives.filter(
			(primitive) => primitive.kind === 'line',
		)
		expect(gridlines.length).toBeGreaterThan(0)
		expect(gridlines.every((line) => line.kind === 'line' && line.dash !== undefined)).toBe(
			true,
		)
	})

	function circlesOf(chartType: InfographicChartType) {
		return sceneFor(chartType)
			.primitives.filter((primitive) => primitive.kind === 'circle')
			.map((circle) => (circle.kind === 'circle' ? circle : { cx: 0, cy: 0, radius: 0 }))
	}

	it('비례 원 둘은 맞닿는다 — 떼어 놓으면 두 덩어리가 따로 읽힌다', () => {
		const [big, small] = circlesOf('proportional-circle')
		const distance = Math.hypot(big.cx - small.cx, big.cy - small.cy)
		expect(Math.abs(distance - (big.radius + small.radius))).toBeLessThan(0.5)
	})

	it('버블 클러스터는 모든 원이 이웃과 맞닿는다', () => {
		const circles = circlesOf('bubble-cluster')
		expect(circles.length).toBeGreaterThan(2)
		// 가장 큰 것이 가운데다 — 나머지는 전부 그것과 맞닿는다.
		const hub = circles.reduce((big, one) => (one.radius > big.radius ? one : big))
		for (const circle of circles) {
			if (circle === hub) continue
			const distance = Math.hypot(hub.cx - circle.cx, hub.cy - circle.cy)
			expect(Math.abs(distance - (hub.radius + circle.radius))).toBeLessThan(0.5)
		}
		// 둘레의 이웃끼리도 맞닿는다 — 어느 원도 혼자 떠 있지 않다.
		for (const circle of circles) {
			if (circle === hub) continue
			const touches = circles.some((other) => {
				if (other === circle || other === hub) return false
				const distance = Math.hypot(other.cx - circle.cx, other.cy - circle.cy)
				return Math.abs(distance - (other.radius + circle.radius)) < 0.5
			})
			expect(touches).toBe(true)
		}
	})

	it('겹친 원은 아래 가장자리가 붙지 않는다 — 일정한 간격으로 올라선다', () => {
		const bottoms = circlesOf('nested-circle').map((circle) => circle.cy + circle.radius)
		const steps = bottoms.slice(1).map((bottom, index) => bottoms[index] - bottom)
		expect(steps.length).toBeGreaterThan(0)
		for (const step of steps) expect(step).toBeGreaterThan(1)
		expect(Math.max(...steps) - Math.min(...steps)).toBeLessThan(0.5)
	})

	it('막대는 사이를 두지 않는다 — 트랙형만 사이를 갖는다', () => {
		const spans = (chartType: InfographicChartType) =>
			sceneFor(chartType)
				.primitives.filter((primitive) => primitive.kind === 'rect')
				.map((rect) => (rect.kind === 'rect' ? [rect.x, rect.x + rect.width] : [0, 0]))
				.sort((left, right) => left[0] - right[0])
		const bars = spans('bar')
		for (let index = 1; index < bars.length; index += 1) {
			expect(bars[index][0] - bars[index - 1][1]).toBeLessThan(0.5)
		}
		// 트랙형은 트랙과 채움이 겹쳐 서므로 자리의 수만큼만 본다.
		const tracks = spans('bar-track').filter((_, index) => index % 2 === 0)
		expect(tracks.length).toBeGreaterThan(1)
		expect(tracks[1][0] - tracks[0][1]).toBeGreaterThan(1)
	})

	it('겹친 사각형은 크기가 같고 아랫변이 한 선에 놓인다', () => {
		const rects = sceneFor('nested-square')
			.primitives.filter((primitive) => primitive.kind === 'rect')
			.map((rect) => (rect.kind === 'rect' ? rect : { x: 0, y: 0, width: 0, height: 0 }))
		expect(rects.length).toBeGreaterThan(1)
		expect(new Set(rects.map((rect) => rect.width.toFixed(4))).size).toBe(1)
		expect(new Set(rects.map((rect) => rect.height.toFixed(4))).size).toBe(1)
		expect(new Set(rects.map((rect) => (rect.y + rect.height).toFixed(4))).size).toBe(1)
	})
})

describe('면 위의 글자는 사라지지 않는다', () => {
	/**
	 * 🔴 짧은 막대에서는 라벨이 채움 밖(트랙·바탕)으로 올라선다. 색을 채움 기준으로만 고르면
	 *    어두운 계열의 짧은 막대에서 흰 글자가 연한 트랙에 얹혀 통째로 사라진다 — 실제로 그랬다.
	 */
	it('막대 트랙의 모든 글자가 자기 뒤에 있는 면과 대비된다', () => {
		const scene = sceneFor('bar-track', {
			// 어두운 계열(마지막 색)에 짧은 막대를 준다 — 이 조합에서 글자가 사라졌다.
			data: parseChartData('아시아\t34\n유럽\t33\n북미\t12\n중동\t4\n기타\t9'),
		})
		const rects = scene.primitives.filter((primitive) => primitive.kind === 'rect')
		const texts = scene.primitives.filter((primitive) => primitive.kind === 'text')
		expect(texts.length).toBeGreaterThan(4)
		for (const text of texts) {
			if (text.kind !== 'text') continue
			// label()이 글자 상자 중앙을 baseline으로 옮겨 놓았으므로 되돌려 중앙을 구한다.
			const centerY = text.y - text.fontSize * 0.35
			// 나중에 그려진 것이 위에 있다 — 마지막으로 닿는 면이 글자 뒤의 면이다.
			const behind = rects.reduce<string>((surface, rect) => {
				if (rect.kind !== 'rect' || !rect.fill) return surface
				const inside =
					text.x >= rect.x &&
					text.x <= rect.x + rect.width &&
					centerY >= rect.y &&
					centerY <= rect.y + rect.height
				return inside ? rect.fill : surface
			}, scene.background ?? '#FFFFFF')
			expect(text.fill, `${text.text} on ${behind}`).toBe(readableTextColor(behind))
		}
	})
})

describe('형태 축', () => {
	/** 그 표현이 실제로 쓰는 축만 — 잠긴 축은 값을 바꿔도 화면이 같아야 한다. */
	function sceneJson(chartType: InfographicChartType, axis: string, value: number) {
		return JSON.stringify(sceneFor(chartType, { [axis]: value } as never).primitives)
	}

	/**
	 * 🔴 회전만 양 끝이 만난다 — 정본 ±180°는 같은 각이라 0과 1이 같은 화면이다.
	 *    축이 살아 있는지는 한 바퀴가 아닌 값끼리 견줘야 보인다.
	 */
	const probe = (axis: string) => (axis === 'rotation' ? [0, 0.25] : [0, 1])

	it('표현이 선언한 축은 값을 바꾸면 화면이 달라진다', () => {
		for (const chart of INFOGRAPHIC_CHART_TYPES) {
			for (const axis of chart.axes as readonly string[]) {
				const [low, high] = probe(axis)
				expect(
					sceneJson(chart.id, axis, low) !== sceneJson(chart.id, axis, high),
					`${chart.id}.${axis}`,
				).toBe(true)
			}
		}
	})

	it('🔴 선언하지 않은 축은 값이 새어 들어가지 않는다', () => {
		for (const chart of INFOGRAPHIC_CHART_TYPES) {
			for (const axis of INFOGRAPHIC_AXES) {
				if ((chart.axes as readonly string[]).includes(axis)) continue
				const [low, high] = probe(axis)
				expect(
					sceneJson(chart.id, axis, low) === sceneJson(chart.id, axis, high),
					`${chart.id}.${axis}`,
				).toBe(true)
			}
		}
	})

	it('쓰지 않는 축만 잠긴다 — 기본값은 좁히지 않는다', () => {
		for (const chart of INFOGRAPHIC_CHART_TYPES) {
			const controls = model.getRestrictions({ chartType: chart.id })?.controls ?? []
			for (const axis of INFOGRAPHIC_AXES) {
				const restriction = controls.find((control) => control.controlId === axis)
				const uses = (chart.axes as readonly string[]).includes(axis)
				expect(restriction?.availability, `${chart.id}.${axis}`).toBe(
					uses ? undefined : 'disabled',
				)
				expect(restriction?.defaultValue, `${chart.id}.${axis}`).toBeUndefined()
			}
		}
	})

	it('🔑 가운데가 정본이다 — 축을 만지지 않은 상태가 도판 모양이다', () => {
		// 파이 조각은 맞붙어 있다.
		expect(sceneFor('pie').primitives.filter((p) => p.kind === 'path')).toHaveLength(5)
		// 선은 꺾은선, 영역은 곡선이다.
		const linePaths = sceneFor('line').primitives.filter((p) => p.kind === 'path' && p.stroke)
		expect(linePaths.every((path) => path.kind === 'path' && !path.d.includes('C'))).toBe(true)
		const areaPath = sceneFor('area').primitives.find((p) => p.kind === 'path')
		expect(areaPath?.kind === 'path' && areaPath.d.includes('C')).toBe(true)
		// 동심원은 중심이 하나다(겹친 원의 아래 간격은 「정본 도판과의 대조」가 본다).
		const centers = sceneFor('concentric-circle')
			.primitives.filter((p) => p.kind === 'circle')
			.map((c) => (c.kind === 'circle' ? c.cy : 0))
		expect(Math.max(...centers) - Math.min(...centers)).toBeLessThan(1)
	})
})
