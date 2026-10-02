import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { StudioLayoutPlayground } from './layout-playground'
import { type PlaygroundOutput, PlaygroundOutputModule } from './output-module'

vi.mock('./image-workspace', () => ({
	PlaygroundImageWorkspace: () => <div>실제 이미지 작업</div>,
}))
vi.mock('./template-workspace', () => ({
	PlaygroundTemplateWorkspace: () => <div>실제 템플릿 작업</div>,
}))

vi.mock('./graphic-workspace', () => ({
	PlaygroundGraphicWorkspace: () => <div>실제 그래픽 작업</div>,
}))

afterEach(cleanup)

// jsdom에는 Select가 사용하는 포인터 캡처·스크롤 API가 없다.
beforeAll(() => {
	Object.defineProperties(HTMLElement.prototype, {
		hasPointerCapture: { configurable: true, value: vi.fn(() => false) },
		scrollIntoView: { configurable: true, value: vi.fn() },
	})
	Object.defineProperties(URL, {
		createObjectURL: { configurable: true, value: vi.fn(() => 'blob:reference-preview') },
		revokeObjectURL: { configurable: true, value: vi.fn() },
	})
})
afterAll(() => {
	Reflect.deleteProperty(HTMLElement.prototype, 'hasPointerCapture')
	Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
	Reflect.deleteProperty(URL, 'createObjectURL')
	Reflect.deleteProperty(URL, 'revokeObjectURL')
})

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

it('세 Generator는 실제 작업 화면으로 연결하고 샘플 컨트롤을 노출하지 않는다', async () => {
	const user = userEvent.setup()
	render(
		<TooltipProvider>
			<StudioLayoutPlayground initialExample="image" />
		</TooltipProvider>,
	)
	const selector = screen.getByRole('combobox', { name: '화면' })
	expect(
		within(selector)
			.getAllByRole('option')
			.map((option) => option.textContent),
	).toEqual(['Image Generator', 'Graphic Generator', 'Template Generator'])
	expect(screen.getByText('실제 이미지 작업')).toBeInTheDocument()
	expect(screen.queryByRole('combobox', { name: '컨트롤' })).not.toBeInTheDocument()
	expect(screen.queryByRole('combobox', { name: '콘텐츠' })).not.toBeInTheDocument()
	await user.selectOptions(selector, 'template')
	expect(screen.getByText('실제 템플릿 작업')).toBeInTheDocument()
	expect(screen.queryByRole('combobox', { name: '그래픽 종류' })).not.toBeInTheDocument()
	await user.selectOptions(selector, 'graphic')
	expect(screen.queryByRole('combobox', { name: '그래픽 종류' })).not.toBeInTheDocument()
	expect(screen.getByText('실제 그래픽 작업')).toBeInTheDocument()
	expect(screen.queryByRole('option', { name: 'Stack' })).not.toBeInTheDocument()
	expect(screen.queryByRole('option', { name: 'Compound' })).not.toBeInTheDocument()
	await user.click(screen.getByRole('checkbox', { name: '경계 표시' }))
	expect(screen.getByRole('main')).toHaveAttribute('data-boundaries', 'true')
})

function OutputExample() {
	const initial: PlaygroundOutput = {
		mode: 'digital',
		width: 300,
		height: 300,
		ppi: 300,
		count: '2',
		ratio: '1:1',
		resolution: '1K',
		notice: '',
	}
	const [value, setValue] = useState(initial)
	const [format, setFormat] = useState('PNG')
	return (
		<>
			<button
				type="button"
				onClick={() => {
					setValue(initial)
					setFormat('PNG')
				}}
			>
				Reset
			</button>
			<PlaygroundOutputModule
				kind="graphic"
				value={value}
				onChange={setValue}
				format={format}
				onFormatChange={setFormat}
				hasResult={false}
				empty={false}
			/>
		</>
	)
}
