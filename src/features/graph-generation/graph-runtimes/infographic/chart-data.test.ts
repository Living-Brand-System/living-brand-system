import { describe, expect, it } from 'vitest'
import { INFOGRAPHIC_SAMPLE_DATA, parseChartData } from './chart-data'
import { INFOGRAPHIC_CHART_TYPES } from './model'

describe('parseChartData', () => {
	it('탭과 쉼표 둘 다 칸을 가른다', () => {
		expect(parseChartData('A\t10\nB\t20').rows).toEqual([
			{ label: 'A', values: [10] },
			{ label: 'B', values: [20] },
		])
		expect(parseChartData('A,10\nB,20').rows).toEqual([
			{ label: 'A', values: [10] },
			{ label: 'B', values: [20] },
		])
	})

	it('첫 줄의 둘째 칸부터가 숫자가 아니면 머리글이다', () => {
		const data = parseChartData('\t09\t08\n1\t0\t0\n2\t18\t12')
		expect(data.series).toEqual(['09', '08'])
		expect(data.rows).toHaveLength(2)
	})

	it('머리글처럼 보여도 숫자면 데이터다', () => {
		const data = parseChartData('A\t10\nB\t20')
		expect(data.series).toEqual([])
		expect(data.rows).toHaveLength(2)
	})

	it('%와 빈 줄은 무시하고 값 없는 줄은 버린다', () => {
		const data = parseChartData('A\t34%\n\n제목만\nB\t12')
		expect(data.rows).toEqual([
			{ label: 'A', values: [34] },
			{ label: 'B', values: [12] },
		])
	})

	it('빈 입력은 빈 데이터다', () => {
		expect(parseChartData('   \n\n').rows).toHaveLength(0)
	})

	it('12종 샘플이 서로 다르다 — 같으면 표현이 무엇에 쓰이는지 말해 주지 못한다', () => {
		const samples = INFOGRAPHIC_CHART_TYPES.map(({ id }) => INFOGRAPHIC_SAMPLE_DATA[id])
		expect(new Set(samples).size).toBe(samples.length)
	})

	it('12종 샘플이 전부 파싱되고 값이 하나 이상 있다', () => {
		for (const { id } of INFOGRAPHIC_CHART_TYPES) {
			const data = parseChartData(INFOGRAPHIC_SAMPLE_DATA[id])
			expect(data.rows.length, id).toBeGreaterThan(1)
			expect(
				data.rows.every((row) => row.values.length > 0),
				id,
			).toBe(true)
		}
	})
})
