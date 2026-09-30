import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PRINT_PPI_VALUES } from '@/features/studio-export/print-policy'
import {
	CUSTOM_ARTBOARD,
	listArtboardOptions,
	matchArtboard,
	presetSizeInPx,
	SizingControls,
} from './output-controls'

/** 300ppi 기준 mm→px. */
const PX_PER_MM = 300 / 25.4

function widthInput() {
	return screen.getByRole('spinbutton', { name: 'Width' })
}

/** 프리셋 밖 해상도를 주면 직접 입력란이 바로 뜬다 — Select는 radix라 열지 않고 이 칸으로 검증한다. */
function manualPpiInput() {
	return screen.queryByRole('spinbutton', { name: '직접 입력' })
}

/** Segmented는 같은 이름의 radio를 둘 이상 그린다(pill 측정용 사본) — 첫 번째가 실제 트리거다. */
function unitRadio(name: 'px' | 'mm') {
	return screen.getAllByRole('radio', { name })[0]
}

type SizingProps = React.ComponentProps<typeof SizingControls>

function renderSizing(
	props: Omit<Partial<SizingProps>, 'onChange' | 'onPpiChange'> & {
		value: SizingProps['value']
		/** 크기 변경을 거부하는 상황을 재현한다. 기본은 받아들임이다. */
		accepts?: boolean
	},
) {
	const onChange = vi.fn<SizingProps['onChange']>(() => props.accepts ?? true)
	const onPpiChange = vi.fn()
	render(
		<SizingControls
			ppi={300}
			ppiOptions={PRINT_PPI_VALUES}
			{...props}
			onChange={onChange}
			onPpiChange={onPpiChange}
		/>,
	)
	return { onChange, onPpiChange }
}

afterEach(cleanup)

describe('SizingControls 단위 전환', () => {
	it('px가 기본이고 저장된 값을 그대로 보여준다', () => {
		renderSizing({ value: { width: 2480, height: 3508 } })

		expect(unitRadio('px')).toHaveAttribute('aria-checked', 'true')
		expect(widthInput()).toHaveValue(2480)
	})

	it('mm로 바꾸면 표시만 환산하고 저장값은 건드리지 않는다', () => {
		const { onChange } = renderSizing({ value: { width: 2480, height: 3508 } })

		fireEvent.click(unitRadio('mm'))

		expect(widthInput()).toHaveValue(Math.round(2480 / PX_PER_MM)) // 210
		// 🔴 단위를 바꾸는 것만으로는 값이 바뀌지 않는다 — 보는 방식만 바꾼 것이다.
		expect(onChange).not.toHaveBeenCalled()
	})

	it('mm로 입력하면 px로 환산해 올려준다', () => {
		const { onChange } = renderSizing({ value: { width: 1103, height: 1246 } })

		fireEvent.click(unitRadio('mm'))
		fireEvent.blur(widthInput(), { target: { value: '210' } })

		// 210mm × (300/25.4) = 2480.31 → 2480
		expect(onChange).toHaveBeenCalledWith({ width: 2480, height: 1246 })
	})

	it('표시 반올림이 손대지 않은 축의 저장값을 오염시키지 않는다', () => {
		// mm 표시는 정수로 깎이지만(1246px → 105mm), 편집하지 않은 축은 px 원본이 그대로 올라간다.
		const { onChange } = renderSizing({ value: { width: 1103, height: 1246 } })

		fireEvent.click(unitRadio('mm'))
		fireEvent.blur(widthInput(), { target: { value: '210' } })

		expect(onChange.mock.calls[0][0].height).toBe(1246)
	})

	it('최대값도 같은 단위로 환산해 비교한다', () => {
		// px 상한 2000은 mm에서 169다 — 환산하지 않으면 mm로 170을 넣어도 통과해 상한이 새 버린다.
		const { onChange } = renderSizing({
			value: { width: 1000, height: 1000 },
			maxWidth: 2000,
			maxHeight: 2000,
		})

		fireEvent.click(unitRadio('mm'))
		fireEvent.blur(widthInput(), { target: { value: '170' } })

		expect(onChange).not.toHaveBeenCalled()
	})

	it('mm 표시는 그 판의 해상도를 따른다 — 같은 픽셀도 해상도가 낮으면 더 큰 판이다', () => {
		renderSizing({ value: { width: 1701, height: 5102 }, ppi: 72 })

		fireEvent.click(unitRadio('mm'))

		expect(widthInput()).toHaveValue(600)
	})
})

describe('해상도는 인쇄(mm)에서만 묻는다', () => {
	// 🔑 px는 디지털이라 해상도라는 개념이 없다. 두 축을 대등하게 두되 각 축의 언어만 보여 준다.
	it('px 모드에서는 해상도 입력이 없다', () => {
		renderSizing({ value: { width: 1080, height: 1080 }, ppi: 350 })

		expect(manualPpiInput()).toBeNull()
	})

	it('mm 모드에서 프리셋 밖 해상도는 직접 입력란으로 보여 준다', () => {
		renderSizing({ value: { width: 2894, height: 4094 }, ppi: 350 })

		fireEvent.click(unitRadio('mm'))

		expect(manualPpiInput()).toHaveValue(350)
	})

	it('해상도를 바꾸면 물리 크기를 지키고 픽셀을 다시 잡는다', () => {
		// 🔴 픽셀을 그대로 두면 A4가 420mm가 된다 — 인쇄물에서 되돌릴 수 없는 사고다.
		const { onChange, onPpiChange } = renderSizing({
			value: { width: 2480, height: 3508 },
			ppi: 350,
		})

		fireEvent.click(unitRadio('mm'))
		fireEvent.blur(manualPpiInput() as HTMLElement, { target: { value: '150' } })

		expect(onPpiChange).toHaveBeenCalledWith(150)
		// 2480px@350ppi = 179.9mm → 150ppi에서 1063px. 판은 그대로 179.9mm다.
		expect(onChange).toHaveBeenCalledWith({ width: 1063, height: 1503 })
	})

	/**
	 * 🔴 이 두 케이스가 2026-09-08 회귀의 가드다. 해상도 변경은 「픽셀을 다시 잡고 → ppi 확정」
	 * 하는 한 쌍인데, 앞쪽이 거부됐는데 뒤쪽이 통과해 **600×1800mm 배너가 144×432mm로 조용히
	 * 줄어** 나갔다. 크기를 못 바꿨으면 해상도도 그대로여야 한다.
	 */
	it('크기 변경이 거부되면 해상도도 바꾸지 않는다', () => {
		const { onChange, onPpiChange } = renderSizing({
			value: { width: 2480, height: 3508 },
			ppi: 350,
			accepts: false,
		})

		fireEvent.click(unitRadio('mm'))
		fireEvent.blur(manualPpiInput() as HTMLElement, { target: { value: '1200' } })

		expect(onChange).toHaveBeenCalled()
		expect(onPpiChange).not.toHaveBeenCalled()
	})

	it('거부되면 이유를 화면에 남긴다 — 조용히 무시하지 않는다', () => {
		renderSizing({ value: { width: 2480, height: 3508 }, ppi: 350, accepts: false })

		fireEvent.click(unitRadio('mm'))
		fireEvent.blur(manualPpiInput() as HTMLElement, { target: { value: '1200' } })

		expect(screen.getByRole('status')).toHaveTextContent('최대')
	})

	it('px 모드에서는 해상도를 바꿔도 판을 건드리지 않는다 — 픽셀이 정본이다', () => {
		const { onChange } = renderSizing({ value: { width: 2480, height: 3508 }, ppi: 350 })

		// px 모드에서는 직접 입력란 자체가 없으므로 판이 바뀔 경로가 없다.
		expect(manualPpiInput()).toBeNull()
		expect(onChange).not.toHaveBeenCalled()
	})
})

describe('한 축만 고친다', () => {
	it('손댄 축만 바뀌고 나머지는 그대로다', () => {
		const { onChange } = renderSizing({ value: { width: 1000, height: 2000 } })

		fireEvent.blur(widthInput(), { target: { value: '500' } })

		expect(onChange).toHaveBeenCalledWith({ width: 500, height: 2000 })
	})
})

describe('대지 프리셋', () => {
	// 🔴 Controller.Select는 radix라 목록이 portal에 있고 열기 전에는 없다. 그래서 위젯을 흔드는
	//    대신 순수 로직을 직접 검증한다 — 프리셋별 dpi·매칭·필터가 버그가 사는 자리다.

	it('mm 규격은 자기 권장 해상도로 px을 만든다', () => {
		// A size는 300ppi → 210mm = 2480px
		expect(presetSizeInPx('a')).toEqual({ width: 2480, height: 3508 })
		// 🔴 배너는 **72ppi**다. 300으로 채우면 21,260px가 되어 캔버스 한도를 넘는다.
		expect(presetSizeInPx('banner')).toEqual({ width: 1701, height: 5102 })
	})

	it('px 규격은 선언값을 그대로 쓴다', () => {
		expect(presetSizeInPx('square')).toEqual({ width: 1080, height: 1080 })
		expect(presetSizeInPx('wide')).toEqual({ width: 1920, height: 1080 })
	})

	it('현재 크기와 같은 프리셋을 찾고, 없으면 직접 입력이다', () => {
		expect(matchArtboard({ width: 1920, height: 1080 }, 300)).toBe('wide')
		expect(matchArtboard({ width: 2480, height: 3508 }, 300)).toBe('a')
		expect(matchArtboard({ width: 1103, height: 1246 }, 300)).toBe(CUSTOM_ARTBOARD)
		expect(matchArtboard({ width: null, height: null }, 300)).toBe(CUSTOM_ARTBOARD)
	})

	it('해상도를 바꿔도 A4는 A4다 — mm 규격은 물리 크기로 견준다', () => {
		// 🔴 px로 견주면 해상도를 건드리는 순간 선택이 「직접 입력」으로 튄다.
		expect(matchArtboard({ width: 1240, height: 1754 }, 150)).toBe('a')
		expect(matchArtboard({ width: 595, height: 842 }, 72)).toBe('a')
	})

	it('한도를 넘는 규격은 목록에서 빠진다', () => {
		const options = listArtboardOptions({
			maxWidth: 1920,
			maxHeight: 1080,
			current: 'square',
		})

		expect(options.map((option) => option.value)).toEqual(['square', 'wide'])
	})

	it('직접 입력 상태에서만 그 항목을 목록에 싣는다', () => {
		expect(listArtboardOptions({ current: 'square' }).map((o) => o.value)).not.toContain(
			CUSTOM_ARTBOARD,
		)
		expect(listArtboardOptions({ current: CUSTOM_ARTBOARD }).map((o) => o.value)).toContain(
			CUSTOM_ARTBOARD,
		)
	})
})
