import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StudioOutput } from '@/components/studio/shared/studio-output'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { StudioOutputFormat } from '@/features/studio-export/export-contract'
import type { PrintPpi } from '@/features/studio-export/print-policy'
import type { OutputMode } from './output-presets'
import { type GraphicOutputSize, GraphicResolution, GraphicSizeEditor } from './size-editor'

// radix Select가 jsdom에 없는 포인터·스크롤·크기 API를 부른다.
beforeEach(() => {
	Object.defineProperties(HTMLElement.prototype, {
		hasPointerCapture: { configurable: true, value: vi.fn(() => false) },
		scrollIntoView: { configurable: true, value: vi.fn() },
	})
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			disconnect() {}
		},
	)
})
afterEach(() => {
	cleanup()
	vi.unstubAllGlobals()
	Reflect.deleteProperty(HTMLElement.prototype, 'hasPointerCapture')
	Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
})

describe('그래픽 Output', () => {
	it('Output의 프리셋·모드·형식 전환과 잘못된 크기 입력은 값과 편집 가능 상태를 보존한다', async () => {
		const user = userEvent.setup()
		render(
			<TooltipProvider>
				<OutputExample />
			</TooltipProvider>,
		)
		const output = within(screen.getByRole('region', { name: '출력 설정' }))
		const choose = async (label: string, option: string) => {
			await user.click(output.getByRole('combobox', { name: label }))
			await user.click(screen.getByRole('option', { name: option }))
		}
		const preset = () => output.getByRole('combobox', { name: 'Preset' })
		const width = () => output.getByRole('spinbutton', { name: '출력 너비' })
		// 프리셋은 크기를 적용할 뿐 입력을 잠그지 않는다.
		await choose('Preset', 'Instagram Feed')
		expect(width()).toHaveValue(1080)
		expect(output.getByRole('spinbutton', { name: '출력 높이' })).toHaveValue(1350)
		expect(preset()).toHaveTextContent('Instagram Feed')
		// 크기를 고치면 어느 프리셋과도 맞지 않으므로 Custom이 된다.
		await user.clear(width())
		await user.type(width(), '1000{Enter}')
		expect(width()).toHaveValue(1000)
		expect(preset()).toHaveTextContent('Custom')
		// 프리셋 크기로 되돌리면 표시도 다시 그 프리셋이다 — 선택 상태는 크기에서 계산한다.
		await user.clear(width())
		await user.type(width(), '1080{Enter}')
		expect(preset()).toHaveTextContent('Instagram Feed')
		await choose('Preset', 'Custom')
		expect(width()).toHaveValue(1080)
		await choose('Format', 'PDF')
		expect(width()).toHaveValue(1080)
		await user.click(output.getByRole('radio', { name: 'Print' }))
		expect(width()).toHaveValue(91.4)
		expect(preset()).toHaveTextContent('Custom')
		await user.click(width())
		await user.tab()
		await user.click(output.getByRole('radio', { name: 'Digital' }))
		expect(width()).toHaveValue(1080)
		await user.click(output.getByRole('radio', { name: 'Print' }))
		await choose('Preset', 'A4')
		expect(width()).toHaveValue(210)
		expect(output.getByRole('spinbutton', { name: '출력 높이' })).toHaveValue(297)
		expect(preset()).toHaveTextContent('A4')
		await user.clear(width())
		await user.type(width(), '0{Enter}')
		expect(width()).toHaveValue(210)
		expect(output.getByRole('status')).toHaveTextContent('0보다 큰 숫자')
		await user.clear(width())
		await user.type(width(), '200{Enter}')
		expect(width()).toHaveValue(200)
		expect(preset()).toHaveTextContent('Custom')
		const ppi = output.getByRole('spinbutton', { name: 'Resolution' })
		await user.clear(ppi)
		await user.type(ppi, '1200{Enter}')
		expect(ppi).toHaveValue(300)
		expect(output.getByRole('status')).toHaveTextContent('크기를 초과')
		await user.click(screen.getByRole('button', { name: 'Reset' }))
		expect(output.getByRole('spinbutton', { name: '출력 너비' })).toHaveValue(300)
		expect(output.getByRole('combobox', { name: 'Format' })).toHaveTextContent('PNG')
		expect(output.queryByRole('status')).not.toBeInTheDocument()
	})
})

function OutputExample() {
	const initial = { width: 300, height: 300, ppi: 300 as PrintPpi }
	const [size, setSize] = useState<GraphicOutputSize>(initial)
	const [mode, setMode] = useState<OutputMode>('digital')
	const [notice, setNotice] = useState('')
	const [format, setFormat] = useState<StudioOutputFormat>('png')
	// 받아들이는 쪽(프로파일 계약)은 모두 통과시킨다 — 여기서는 편집기 자체의 동작만 본다.
	const props = {
		mode,
		size,
		onResize: (next: GraphicOutputSize) => {
			setSize(next)
			setNotice('')
		},
		onNotice: setNotice,
	}
	return (
		<>
			<button
				type="button"
				onClick={() => {
					setSize(initial)
					setMode('digital')
					setFormat('png')
					setNotice('')
				}}
			>
				Reset
			</button>
			<StudioOutput.Root
				footer={<StudioOutput.Messages error={null} notices={notice ? [notice] : []} />}
			>
				<GraphicSizeEditor
					{...props}
					printable
					onModeChange={(next) => {
						setMode(next)
						setNotice('')
					}}
				/>
				<StudioOutput.Format value={format} options={['png', 'pdf']} set={setFormat} />
				{mode === 'print' && <GraphicResolution {...props} />}
			</StudioOutput.Root>
		</>
	)
}
