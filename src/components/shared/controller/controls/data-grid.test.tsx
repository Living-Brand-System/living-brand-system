import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ControllerDataGrid, formatGrid, parseGrid } from './data-grid'

describe('controller data grid', () => {
	it('탭과 쉼표 둘 다 칸으로 읽고 탭으로 되돌려 쓴다', () => {
		expect(parseGrid('A\t1\nB\t2')).toEqual([
			['A', '1'],
			['B', '2'],
		])
		expect(formatGrid(parseGrid('A,1\nB,2'))).toBe('A\t1\nB\t2')
	})

	it('빈 줄은 행이 아니다', () => {
		expect(parseGrid('A\t1\n\n\nB\t2')).toHaveLength(2)
	})

	it('격자를 거쳐도 값이 보존된다', () => {
		const text = '항목 A\t34\n항목 B\t33'
		expect(formatGrid(parseGrid(text))).toBe(text)
	})
})

describe('넓은 표', () => {
	afterEach(cleanup)

	const WIDE = ['구분', ...Array.from({ length: 12 }, (_, month) => `${month + 1}월`)].join('\t')

	/**
	 * 🔴 예전에는 8열에서 잘랐다. 그보다 넓은 표를 붙여넣은 뒤 **아무 칸이나 고치면** 9열부터가
	 *    조용히 사라졌다 — 화면에도 안 보이고 오류도 안 났다. 격자는 편집기지 검사기가 아니다.
	 */
	it('열 수에 상한이 없다 — 한 칸을 고쳐도 나머지 열이 사라지지 않는다', () => {
		const onChange = vi.fn()
		render(<ControllerDataGrid value={WIDE} onChange={onChange} />)
		const first = screen.getByLabelText('1행 1열')
		fireEvent.change(first, { target: { value: '지역' } })
		expect(onChange).toHaveBeenCalledTimes(1)
		const next = parseGrid(onChange.mock.calls[0][0])
		expect(next[0]).toHaveLength(13)
		expect(next[0][0]).toBe('지역')
		expect(next[0][12]).toBe('12월')
	})

	it('열마다 칸이 서고 좁아지면 가로로 스크롤한다', () => {
		const { container } = render(<ControllerDataGrid value={WIDE} onChange={() => {}} />)
		expect(screen.getAllByRole('textbox')).toHaveLength(13)
		expect(container.querySelector('.overflow-x-auto')).not.toBeNull()
	})
})
