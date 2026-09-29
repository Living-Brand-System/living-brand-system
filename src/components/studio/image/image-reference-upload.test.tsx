import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ImageReferenceUpload } from './image-reference-upload'

const file = () => new File(['x'], 'ref.png', { type: 'image/png' })

function setup(disabled = false) {
	const onAttach = vi.fn()
	render(
		<ImageReferenceUpload
			value={null}
			name={null}
			error={null}
			disabled={disabled}
			onAttach={onAttach}
			onClear={vi.fn()}
		/>,
	)
	return { onAttach, zone: screen.getByLabelText(/참조 이미지 놓는 자리/) }
}

describe('ImageReferenceUpload', () => {
	afterEach(cleanup)

	it('끌어다 놓은 파일과 붙여넣은 파일을 같은 경로로 넘긴다', () => {
		const { onAttach, zone } = setup()

		fireEvent.drop(zone, { dataTransfer: { files: [file()] } })
		fireEvent.paste(zone, { clipboardData: { files: [file()] } })

		expect(onAttach).toHaveBeenCalledTimes(2)
		expect(onAttach.mock.calls.every(([given]) => given.name === 'ref.png')).toBe(true)
	})

	// 🔴 생성 중에는 버튼만 잠그면 부족하다 — 끌어다 놓기·붙여넣기가 잠금을 우회한다.
	it('잠겨 있으면 드롭도 붙여넣기도 받지 않는다', () => {
		const { onAttach, zone } = setup(true)

		fireEvent.drop(zone, { dataTransfer: { files: [file()] } })
		fireEvent.paste(zone, { clipboardData: { files: [file()] } })

		expect(onAttach).not.toHaveBeenCalled()
	})

	it('파일 없는 붙여넣기는 가로채지 않는다 — 글자 붙여넣기가 죽으면 안 된다', () => {
		const { onAttach, zone } = setup()

		fireEvent.paste(zone, { clipboardData: { files: [] } })

		expect(onAttach).not.toHaveBeenCalled()
	})
})
