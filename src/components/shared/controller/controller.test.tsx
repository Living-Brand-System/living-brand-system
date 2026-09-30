import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Controller } from './index'

describe('Controller layout', () => {
	afterEach(cleanup)

	it('Root 아래 Header·Content·Group·Footer를 명시적으로 조합한다', () => {
		const { container } = render(
			<Controller.Root>
				<Controller.Header>헤더</Controller.Header>
				<Controller.Content>
					<Controller.Group title="그룹">
						<div>컨트롤</div>
					</Controller.Group>
				</Controller.Content>
				<Controller.Footer>실행</Controller.Footer>
			</Controller.Root>,
		)

		expect(container.querySelector('[data-slot="controller-root"]')).toHaveClass(
			'overflow-hidden',
		)
		expect(container.querySelector('[data-slot="controller-header"]')).toHaveClass('shrink-0')
		expect(container.querySelector('[data-slot="controller-content"]')).toHaveClass(
			'min-h-0',
			'flex-1',
			'overflow-y-auto',
		)
		expect(container.querySelector('[data-slot="controller-group"]')).toBeInTheDocument()
		expect(screen.getByText('그룹')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '그룹' })).toBeInTheDocument()
		expect(container.querySelector('[data-slot="controller-footer"]')).toHaveClass('shrink-0')
	})
})

describe('Controller.Group', () => {
	afterEach(cleanup)

	it('항상 접고 펼칠 수 있고 닫힐 때 본문을 퇴장시킨다', async () => {
		const { container } = render(
			<Controller.Group title="Sec">
				<div>내용물</div>
			</Controller.Group>,
		)
		const content = container.querySelector('[data-slot="controller-group-content"]')

		fireEvent.click(screen.getByRole('button', { name: 'Sec' }))
		expect(screen.getByRole('button', { name: 'Sec' })).toHaveAttribute(
			'aria-expanded',
			'false',
		)
		await waitFor(() => expect(content).toHaveStyle({ height: '0px', opacity: '0' }))
	})

	it('onActivate가 없으면 헤더 전체가 토글한다 — 이 컴포넌트를 쓰는 나머지 화면의 기본', () => {
		render(
			<Controller.Group title="Sec">
				<div>내용물</div>
			</Controller.Group>,
		)
		// 제목 자체가 트리거의 접근 가능한 이름이다 = 헤더 전체가 버튼이다.
		expect(screen.getByRole('button', { name: 'Sec' })).toHaveClass('w-full')
		expect(screen.queryByRole('button', { name: 'Sec 섹션 접고 펴기' })).toBeNull()
	})

	it('onActivate를 주면 chevron만 토글하고 헤더의 나머지는 섹션을 활성화한다', async () => {
		const onActivate = vi.fn()
		const { container } = render(
			<Controller.Group title="Sec" onActivate={onActivate}>
				<div>내용물</div>
			</Controller.Group>,
		)
		const toggle = screen.getByRole('button', { name: 'Sec 섹션 접고 펴기' })
		const content = container.querySelector('[data-slot="controller-group-content"]')

		// 제목을 눌러도 접히지 않는다 — 활성화만 된다.
		fireEvent.click(screen.getByText('Sec'))
		expect(onActivate).toHaveBeenCalledTimes(1)
		expect(toggle).toHaveAttribute('aria-expanded', 'true')

		// 본문을 눌러도 활성화된다 — 섹션 안 아무 곳이나.
		fireEvent.click(screen.getByText('내용물'))
		expect(onActivate).toHaveBeenCalledTimes(2)

		// chevron은 접기만 한다 — 활성화로 새지 않는다(stopPropagation).
		fireEvent.click(toggle)
		expect(onActivate).toHaveBeenCalledTimes(2)
		expect(toggle).toHaveAttribute('aria-expanded', 'false')
		await waitFor(() => expect(content).toHaveStyle({ height: '0px', opacity: '0' }))
	})

	it('활성 섹션은 패널 폭 전체로 번지는 면을 갖는다 — 경계가 읽히게', () => {
		const { container, rerender } = render(
			<Controller.Group title="Sec" onActivate={() => {}}>
				<div>내용물</div>
			</Controller.Group>,
		)
		const group = () => container.querySelector('[data-slot="controller-group"]')
		expect(group()).not.toHaveAttribute('data-active')

		rerender(
			<Controller.Group title="Sec" active onActivate={() => {}}>
				<div>내용물</div>
			</Controller.Group>,
		)
		expect(group()).toHaveAttribute('data-active', 'true')
		// Content의 px-4를 상쇄해 좌우 끝까지 닿는다.
		expect(group()).toHaveClass('data-[active]:-mx-4', 'data-[active]:px-4')
		// 🔴 hover가 bg-muted이므로 활성은 primary로만 칠한다(docs/09 §5).
		expect(group()).toHaveClass('data-[active]:bg-primary/5')
	})

	it('잠금 중에도 사용자의 접힘 상태를 보존한다 — 풀려도 닫힌 채 남는다', async () => {
		const { container, rerender } = render(
			<Controller.Group title="Sec">
				<div>내용물</div>
			</Controller.Group>,
		)
		expect(screen.getByText('내용물')).toBeInTheDocument()

		// 사용자가 접는다.
		fireEvent.click(screen.getByRole('button', { name: 'Sec' }))
		await waitFor(() =>
			expect(container.querySelector('[data-slot="controller-group-content"]')).toHaveStyle({
				height: '0px',
				opacity: '0',
			}),
		)

		// 잠금 — 닫힘 유지 + 토글 불가.
		rerender(
			<Controller.Group title="Sec" disabled>
				<div>내용물</div>
			</Controller.Group>,
		)
		expect(screen.getByRole('button', { name: 'Sec' })).toBeDisabled()
		expect(screen.getByRole('button', { name: 'Sec' })).toHaveAttribute(
			'aria-expanded',
			'false',
		)

		// 잠금 해제 — 강제로 열지 않고 사용자가 접어둔 상태로 복귀한다.
		rerender(
			<Controller.Group title="Sec">
				<div>내용물</div>
			</Controller.Group>,
		)
		expect(screen.getByRole('button', { name: 'Sec' })).toBeEnabled()
		expect(screen.getByRole('button', { name: 'Sec' })).toHaveAttribute(
			'aria-expanded',
			'false',
		)
	})
})

describe('Controller.Row', () => {
	afterEach(cleanup)

	it('안의 킷 컨트롤은 라벨 연결 id를 자동으로 이어받는다 — 수동 htmlFor 배선 없음', () => {
		render(
			<Controller.Row label="Perspective">
				<Controller.Select
					options={[{ value: 'flat', label: 'Flat' }]}
					value="flat"
					onChange={vi.fn()}
				/>
			</Controller.Row>,
		)
		// 라벨 텍스트가 곧 셀렉트의 접근 가능한 이름이 된다.
		expect(screen.getByRole('combobox', { name: 'Perspective' })).toBeInTheDocument()
	})

	it('disabled 행은 흐려지고 안의 컨트롤도 컨텍스트로 함께 비활성된다 — Admin Fixed 상태', () => {
		render(
			<Controller.Row label="Toggle" disabled data-testid="row">
				<Controller.Segmented
					aria-label="가변 두께"
					options={[
						{ value: 'off', label: 'Off' },
						{ value: 'on', label: 'On' },
					]}
					value="off"
					onChange={vi.fn()}
				/>
			</Controller.Row>,
		)
		const row = screen.getByTestId('row')
		expect(row).toHaveAttribute('aria-disabled', 'true')
		expect(row.className).toContain('opacity-50')
		expect(row.className).toContain('pointer-events-none')
		// disabled를 세그먼트에 다시 전달하지 않아도 컨텍스트가 막는다.
		expect(screen.getByRole('radio', { name: 'On' })).toBeDisabled()
	})

	it('readonly 행은 라벨이 span이라 죽은 label 클릭 어포던스를 만들지 않는다', () => {
		render(
			<Controller.Row label="Size" readonly>
				<span>210 × 297mm</span>
			</Controller.Row>,
		)
		expect(screen.getByText('Size').tagName).toBe('SPAN')
	})

	it('아이콘 라벨은 sr-only 텍스트로 접근 가능한 이름을 동반한다 — 컨트롤러 API label 계약', () => {
		render(
			<Controller.Row
				label={
					<>
						<svg aria-hidden className="size-6" />
						<span className="sr-only">Quality</span>
					</>
				}
				readonly
			>
				<span>High</span>
			</Controller.Row>,
		)
		expect(screen.getByText('Quality')).toBeInTheDocument()
	})
})

describe('Controller.Field', () => {
	afterEach(cleanup)

	it('counter가 라벨 행에 표시되고, 안의 Textarea는 라벨과 자동 연결된다', () => {
		render(
			<Controller.Field label="Prompt" counter="190/250">
				<Controller.Textarea />
			</Controller.Field>,
		)
		expect(screen.getByText('190/250')).toBeInTheDocument()
		expect(screen.getByLabelText('Prompt')).toBeInTheDocument()
	})

	it('disabled를 안의 입력까지 전달한다', () => {
		render(
			<Controller.Field label="Prompt" disabled data-testid="field">
				<Controller.Textarea />
			</Controller.Field>,
		)
		expect(screen.getByTestId('field')).toHaveAttribute('aria-disabled', 'true')
		expect(screen.getByLabelText('Prompt')).toBeDisabled()
	})
})

describe('Controller value controls', () => {
	afterEach(cleanup)

	it('Segmented 체이서는 활성 버튼의 실제 폭을 따라 이동한다', () => {
		const options = [
			{ value: 'short', label: 'On' },
			{ value: 'long', label: 'Generate' },
		] as const
		const { container, rerender } = render(
			<Controller.Segmented
				aria-label="모드"
				options={options}
				value="short"
				onChange={vi.fn()}
			/>,
		)

		expect(
			container.querySelector('[data-slot="controller-segmented-pill"]')?.parentElement,
		).toHaveTextContent('On')

		rerender(
			<Controller.Segmented
				aria-label="모드"
				options={options}
				value="long"
				onChange={vi.fn()}
			/>,
		)
		expect(
			container.querySelector('[data-slot="controller-segmented-pill"]')?.parentElement,
		).toHaveTextContent('Generate')
	})

	it('Range는 화살표 키로 계약의 step만큼 값을 바꾼다', () => {
		const onChange = vi.fn()
		render(
			<Controller.Range
				label="Scale"
				value={1}
				min={0.2}
				max={5}
				step={0.05}
				onChange={onChange}
			/>,
		)

		fireEvent.keyDown(screen.getByRole('slider', { name: 'Scale' }), { key: 'ArrowRight' })
		expect(onChange).toHaveBeenCalledWith(1.05)
	})

	it('Range는 임계 안에서 뗀 클릭은 뗀 지점만, 드래그는 이동마다 반영한다', () => {
		const onChange = vi.fn()
		render(
			<Controller.Range
				label="Scale"
				value={0}
				min={0}
				max={10}
				step={1}
				onChange={onChange}
			/>,
		)
		const track = screen.getByRole('slider', { name: 'Scale' })
		// jsdom에는 레이아웃이 없다 — 비율 환산의 기준 사각형만 실측처럼 세운다.
		vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
			left: 0,
			top: 0,
			width: 100,
			height: 36,
			right: 100,
			bottom: 36,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		} as DOMRect)

		// 클릭: 누른 순간에는 값이 움직이지 않고, 임계(3px) 안의 손떨림도 드래그가 되지 않는다.
		fireEvent.pointerDown(track, { clientX: 30, clientY: 18, button: 0 })
		expect(onChange).not.toHaveBeenCalled()
		fireEvent.pointerMove(track, { clientX: 31, clientY: 18 })
		expect(onChange).not.toHaveBeenCalled()
		fireEvent.pointerUp(track, { clientX: 31, clientY: 18 })
		expect(onChange.mock.calls).toEqual([[3]])

		// 드래그: 임계를 넘긴 뒤로는 이동마다 값이 따라온다.
		onChange.mockClear()
		fireEvent.pointerDown(track, { clientX: 30, clientY: 18, button: 0 })
		fireEvent.pointerMove(track, { clientX: 60, clientY: 18 })
		fireEvent.pointerMove(track, { clientX: 80, clientY: 18 })
		fireEvent.pointerUp(track, { clientX: 80, clientY: 18 })
		expect(onChange.mock.calls).toEqual([[6], [8]])
	})

	it('Pad는 화살표 키로 x·y 단위 객체를 갱신한다', () => {
		const onChange = vi.fn()
		render(
			<Controller.Pad aria-label="그래픽 위치" value={{ x: 0, y: 0 }} onChange={onChange} />,
		)

		fireEvent.keyDown(screen.getByRole('slider', { name: '그래픽 위치' }), {
			key: 'ArrowDown',
		})
		expect(onChange).toHaveBeenCalledWith({ x: 0, y: 0.05 })
	})
})

describe('Controller.AssetCard', () => {
	afterEach(cleanup)

	function renderAssetCard(disabled = false, previewImage?: { url: string; alt: string }) {
		return render(
			<Controller.Browser.Root>
				<Controller.AssetCard
					title="제품컷"
					subtitle="Brand Image"
					buttonLabel="Change"
					aria-label="프로파일 변경"
					tabs={['Image Profiles']}
					previewImage={previewImage}
					disabled={disabled}
				>
					<div>고를 것들</div>
				</Controller.AssetCard>
			</Controller.Browser.Root>,
		)
	}

	it('현재 값·출처·열기 버튼을 그리고, 버튼 이름은 무엇을 여는지 말한다', () => {
		renderAssetCard()

		expect(screen.getByText('제품컷')).toBeInTheDocument()
		expect(screen.getByText('Brand Image')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '프로파일 변경' })).toHaveTextContent('Change')
	})

	it('버튼으로 브라우저 패널이 열리고 본문은 소비자가 준 것이다', () => {
		renderAssetCard()
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '프로파일 변경' }))

		const panel = screen.getByRole('dialog', { name: 'Image Profiles' })
		expect(panel).toHaveTextContent('고를 것들')
	})

	// 배경 이미지는 장식이다 — 카드가 무엇인지는 제목이 말하므로 접근성 트리에 이름을 하나 더 넣지 않는다.
	it('미리보기 이미지가 있으면 카드 배경으로 깔고 접근성 트리에서는 감춘다', () => {
		const { container } = renderAssetCard(false, { url: '/media/preview.png', alt: '무시됨' })

		const background = container.querySelector('img')
		expect(background).toHaveAttribute('src', '/media/preview.png')
		expect(background).toHaveAttribute('alt', '')
		expect(background).toHaveAttribute('aria-hidden', 'true')
	})

	it('미리보기 이미지가 없으면 배경 이미지를 두지 않는다', () => {
		const { container } = renderAssetCard()

		expect(container.querySelector('img')).toBeNull()
	})

	// 한 Root 아래 카드가 여럿일 때(사이드바의 템플릿·이미지 슬롯·배경) 각자 자기 패널만 열려야 한다.
	// 열림 상태를 카드끼리 나눠 쓰면 누른 트리거가 "패널 밖"으로 판정돼 열렸다가 곧 닫힌다.
	it('카드가 여럿이면 각자 자기 패널만 연다', async () => {
		const user = userEvent.setup()
		render(
			<Controller.Browser.Root>
				<Controller.AssetCard
					title="템플릿"
					buttonLabel="Change"
					aria-label="템플릿 변경"
					tabs={['Templates']}
				>
					<div>템플릿 목록</div>
				</Controller.AssetCard>
				<Controller.AssetCard
					title="이미지"
					buttonLabel="Browse"
					aria-label="샘플 이미지 선택"
					tabs={['Sample Images']}
				>
					<div>샘플 목록</div>
				</Controller.AssetCard>
			</Controller.Browser.Root>,
		)

		await user.click(screen.getByRole('button', { name: '샘플 이미지 선택' }))

		expect(screen.getByRole('dialog', { name: 'Sample Images' })).toBeInTheDocument()
		expect(screen.queryByRole('dialog', { name: 'Templates' })).toBeNull()
	})

	// 배선 전 카드는 트리거 자체를 두지 않는다 — 열리는 척하는 컨트롤을 만들지 않기 위해서다.
	it('잠긴 카드는 눌러도 패널이 열리지 않는다', () => {
		renderAssetCard(true)

		const button = screen.getByRole('button', { name: '프로파일 변경' })
		expect(button).toBeDisabled()
		fireEvent.click(button)
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})
})

describe('Controller.Browser.Thumbnail', () => {
	afterEach(cleanup)

	// 브라우저 카드의 미리보기는 장식이 아니다 — 이름이 말해주지 않는 "무엇처럼 생겼나"를 전하므로
	// 어드민이 등록한 alt를 그대로 쓴다.
	it('이미지가 있으면 어드민 alt와 함께 그리고, 없으면 빈 표면만 남는다', () => {
		const withImage = render(
			<Controller.Browser.Thumbnail image={{ url: '/media/card.png', alt: '방사형 광선' }} />,
		)
		expect(screen.getByRole('img', { name: '방사형 광선' })).toHaveAttribute(
			'src',
			'/media/card.png',
		)
		withImage.unmount()

		const { container } = render(<Controller.Browser.Thumbnail />)
		expect(container.querySelector('img')).toBeNull()
		expect(container.querySelector('[data-slot="controller-browser-thumbnail"]')).not.toBeNull()
	})
})

describe('Controller.CameraControl', () => {
	afterEach(cleanup)

	it('정사각 프리뷰 슬롯과 축 셀렉트를 그린다 — 프리뷰 렌더러는 소비자 소유', () => {
		render(
			<Controller.CameraControl
				axes={[
					{
						label: 'X',
						options: [{ value: 'front', label: 'Front' }],
						value: 'front',
						onChange: vi.fn(),
					},
					{
						label: 'Y',
						options: [{ value: 'front', label: 'Front' }],
						value: 'front',
						onChange: vi.fn(),
					},
				]}
			>
				<div data-testid="orbit-preview" />
			</Controller.CameraControl>,
		)
		expect(screen.getByTestId('orbit-preview')).toBeInTheDocument()
		expect(screen.getByRole('combobox', { name: 'X' })).toBeInTheDocument()
		expect(screen.getByRole('combobox', { name: 'Y' })).toBeInTheDocument()
	})
})

describe('Controller.Action', () => {
	afterEach(cleanup)

	it('면 위에서 묻히지 않도록 ghost의 muted hover를 겹침으로 바꾼다', () => {
		render(
			<Controller.Row readonly label="Key">
				<Controller.Action aria-label="복사">
					<span />
				</Controller.Action>
			</Controller.Row>,
		)

		const action = screen.getByRole('button', { name: '복사' })
		// 🔴 Row가 bg-muted라, ghost 기본 hover(bg-muted)가 남으면 hover가 같은 색으로 사라진다.
		expect(action).not.toHaveClass('hover:bg-muted')
		expect(action).toHaveClass('hover:bg-foreground/5', 'dark:hover:bg-foreground/5')
	})
})

describe('Controller.Status', () => {
	afterEach(cleanup)

	it('면 위에서 묻히지 않게 muted를 겹침으로 낸다', () => {
		const { container } = render(
			<Controller.Row readonly label="Key">
				<Controller.Status label="미검사" />
			</Controller.Row>,
		)

		const status = container.querySelector('[data-slot="controller-status"]')
		// 🔴 Row가 bg-muted다 — 타일도 bg-muted면 같은 색으로 사라진다.
		expect(status).not.toHaveClass('bg-muted')
		expect(status).toHaveClass('bg-foreground/5')
	})

	it('아이콘뿐이어도 라벨로 읽힌다', () => {
		render(
			<Controller.Status tone="success" label="통과">
				<svg aria-hidden />
			</Controller.Status>,
		)

		expect(screen.getByText('통과')).toHaveClass('sr-only')
	})
})

describe('Controller 색 선택 라디오 묶음', () => {
	afterEach(cleanup)

	const COLORWAYS = [
		{ value: 'white', label: '화이트 · 연그린', colors: ['#FFFFFF', '#DCF5D2'] },
		{ value: 'dark', label: '다크그린 · 그린', colors: ['#00280A', '#007332'] },
	]

	it('ColorChips: 라벨 클릭이 값을 바꾸지 않고, 묶음이 라벨로 읽힌다', () => {
		const onChange = vi.fn()
		render(
			<Controller.ColorChips
				label="컬러"
				options={COLORWAYS}
				value="dark"
				onChange={onChange}
			/>,
		)
		// 🔴 라벨이 첫 칩을 가리키면 클릭이 포커스가 아니라 '첫 조합 선택'이 된다.
		fireEvent.click(screen.getByText('컬러'))
		expect(onChange).not.toHaveBeenCalled()
		// 스크린리더가 "무엇의 라디오인지"를 말할 수 있어야 한다.
		expect(screen.getByRole('radiogroup', { name: '컬러' })).toBeInTheDocument()
		expect(screen.getByRole('radio', { name: '다크그린 · 그린' })).toBeChecked()
	})

	it('ColorPalette: 라벨 클릭이 값을 바꾸지 않고, 묶음이 라벨로 읽힌다', () => {
		const onChange = vi.fn()
		render(
			<Controller.ColorRow
				label="선 색"
				value="#00af41"
				values={['#ff0000', '#00af41']}
				onChange={onChange}
			/>,
		)
		fireEvent.click(screen.getByText('선 색'))
		expect(onChange).not.toHaveBeenCalled()
		expect(screen.getByRole('radiogroup', { name: '선 색' })).toBeInTheDocument()
	})
})

describe('Controller.ListRow', () => {
	afterEach(cleanup)

	it('누를 수 있으면 button, 표시만 하면 div로 렌더한다', () => {
		const { container: staticRow } = render(
			<Controller.ListRow caption="Scenario Name" label="File Name" />,
		)
		// 🔴 눌러도 아무 일이 없는 button은 거짓 어포던스다(Row의 readonly와 같은 이유).
		expect(staticRow.querySelector('button')).toBeNull()

		cleanup()
		render(<Controller.ListRow label="File Name" onClick={() => {}} />)
		expect(screen.getByRole('button', { name: 'File Name' })).toBeInTheDocument()
	})
})
