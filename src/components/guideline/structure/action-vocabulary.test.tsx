import { Renew } from '@carbon/icons-react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { expect, it, vi } from 'vitest'
import { GuidelineCardActions } from './card-actions'
import { GuidelineColorSwatch, GuidelineLogoBackgroundDisplay } from './color-displays'
import { GuidelineSection, GuidelineSectionHeading } from './components'
import { type GuidelineCardData, GuidelineDisplayFrame, GuidelineGridContainer } from './grid'
import { GuidelineCiLockupDisplay } from './guide-displays'
import { GuidelineTypeWeightAdjustableDisplay } from './type-weight-display'

it('END 복사와 항목 복사의 대상을 구분하고 실패·색상 선택·초기화를 처리한다', async () => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			disconnect() {}
		},
	)
	vi.stubGlobal('matchMedia', () => ({
		matches: true,
		addEventListener() {},
		removeEventListener() {},
	}))
	const fonts = Object.getOwnPropertyDescriptor(document, 'fonts')
	Object.defineProperty(document, 'fonts', {
		configurable: true,
		value: { ready: Promise.resolve() },
	})
	const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
	const writeText = vi.fn().mockResolvedValue(undefined)
	Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
	const { container, unmount } = render(
		<GuidelineActionVocabularyPlayground
			colors={{
				'HD HERITAGE GREEN': '#00af41',
				'HD DISCOVERY BLUE': '#003087',
				'HD ECO GREEN': '#73d75a',
			}}
		/>,
	)
	try {
		fireEvent.click(screen.getByRole('button', { name: '브랜드명 복사' }))
		await waitFor(() =>
			expect(screen.getByRole('button', { name: '브랜드명 복사' })).toHaveTextContent(
				'Copied',
			),
		)
		expect(writeText).toHaveBeenLastCalledWith('HD현대')
		const copyItem = screen.getByRole('button', { name: 'HERITAGE GREEN 색상값 복사' })
		expect(copyItem.querySelector('svg')).toBeNull()
		fireEvent.mouseMove(copyItem, { clientX: 100, clientY: 120 })
		expect(screen.getByText('Copy to clipboard')).toHaveStyle({ left: '112px', top: '132px' })
		fireEvent.mouseMove(copyItem, { clientX: 150, clientY: 160 })
		expect(screen.getByText('Copy to clipboard')).toHaveStyle({ left: '162px', top: '172px' })
		fireEvent.click(copyItem)
		await waitFor(() => expect(writeText).toHaveBeenLastCalledWith('#00af41'))
		expect(document.querySelector('[data-slot="copy-cursor-hint"]')).toHaveTextContent('Copied')
		fireEvent.mouseLeave(copyItem)
		expect(document.querySelector('[data-slot="copy-cursor-hint"]')).toBeNull()
		fireEvent.click(screen.getByRole('button', { name: '모든 색상값 복사' }))
		await waitFor(() =>
			expect(writeText).toHaveBeenLastCalledWith(
				'HERITAGE GREEN: #00af41\nDISCOVERY BLUE: #003087\nECO GREEN: #73d75a',
			),
		)
		writeText.mockRejectedValueOnce(new Error('denied'))
		fireEvent.click(screen.getByRole('button', { name: '브랜드명 복사' }))
		await waitFor(() => expect(screen.getByText('복사 실패 · 다시 시도하세요')).toBeVisible())
		const group = screen.getByRole('group', { name: '배경색' })
		const blue = within(group).getByRole('button', { name: 'DISCOVERY BLUE' })
		fireEvent.click(blue)
		expect(blue).toHaveAttribute('aria-pressed', 'true')
		expect(blue).toHaveStyle({ opacity: '1' })
		const frame = group.closest('[data-slot="guideline-card-display"]') as HTMLElement
		expect(frame.style.getPropertyValue('--guideline-display-background')).toBe('#003087')
		fireEvent.change(screen.getByLabelText('배경색 직접 입력'), {
			target: { value: '#123456' },
		})
		expect(frame.style.getPropertyValue('--guideline-display-background')).toBe('#123456')
		expect(blue).toHaveAttribute('aria-pressed', 'false')
		expect(blue).toHaveStyle({ opacity: '0.3' })
		fireEvent.click(screen.getByRole('button', { name: '배경색 초기화' }))
		expect(frame.style.getPropertyValue('--guideline-display-background')).toBe('#00af41')
		expect(
			container.querySelector('[data-position="end"] [data-slot="toggle-group"]'),
		).toBeNull()
		const breadcrumb = screen.getByRole('navigation', { name: 'CI 조합 단계' })
		expect(within(breadcrumb).getByText('해외지사')).toHaveAttribute('aria-current', 'page')
		fireEvent.click(within(breadcrumb).getByRole('button', { name: '본사' }))
		expect(within(breadcrumb).queryByText('해외지사')).toBeNull()
		expect(within(breadcrumb).getByText('본사')).toHaveAttribute('aria-current', 'page')
		fireEvent.click(screen.getByRole('button', { name: 'CI 조합 초기화' }))
		expect(within(breadcrumb).getByText('해외지사')).toHaveAttribute('aria-current', 'page')
		fireEvent.click(screen.getByRole('radio', { name: 'Bold' }))
		expect(screen.getByRole('radio', { name: 'Bold' })).toHaveAttribute('aria-checked', 'true')
	} finally {
		unmount()
		if (original) Object.defineProperty(navigator, 'clipboard', original)
		else Reflect.deleteProperty(navigator, 'clipboard')
		if (fonts) Object.defineProperty(document, 'fonts', fonts)
		else Reflect.deleteProperty(document, 'fonts')
		vi.unstubAllGlobals()
	}
})

/** 실제 공용 액션을 조합한 테스트 대역 — 지운 가이드라인 목업의 조합을 그대로 옮겼다. */
const CI_STAGES = [
	{ id: 'group', label: '본사' },
	{ id: 'subsidiary', label: '계열사' },
	{ id: 'branch', label: '해외지사' },
] as const

function CiBreadcrumbDisplay({ colors }: { colors: Record<string, string> }) {
	const [stage, setStage] = useState(2)
	return (
		<GuidelineCiLockupDisplay
			colors={colors}
			fixed={{ subsidiaryOn: stage >= 1, branchOn: stage >= 2 }}
			breadcrumb={{
				kind: 'breadcrumb',
				label: 'CI 조합 단계',
				items: CI_STAGES.slice(0, stage + 1),
				onNavigate: (id) => {
					const index = CI_STAGES.findIndex((item) => item.id === id)
					if (index >= 0) setStage(index)
				},
			}}
			end={{
				kind: 'button',
				label: 'CI 조합 초기화',
				icon: <Renew size={17} />,
				onClick: () => setStage(2),
			}}
		/>
	)
}

function GuidelineActionVocabularyPlayground({
	colors: palette,
}: {
	colors: Record<string, string>
}) {
	const colors = ['HD HERITAGE GREEN', 'HD DISCOVERY BLUE', 'HD ECO GREEN']
		.filter((label) => /^#[0-9a-f]{6}$/i.test(palette[label] ?? ''))
		.map((label) => ({ label: label.replace('HD ', ''), value: palette[label] }))
	const cards: GuidelineCardData[] = [
		{
			id: 'ci-breadcrumb',
			ratio: '1:1',
			display: <CiBreadcrumbDisplay colors={palette} />,
			caption: {
				title: 'CI 조합 단계 · CENTER',
				description:
					'앞 단계를 누르면 해당 단계의 조합으로 돌아갑니다. 우측 초기화로 전체 조합을 복원합니다. 단계별 구성 예시이며 실제 조직 관계를 의미하지 않습니다.',
			},
		},
		{
			id: 'multi-toggle',
			ratio: '1:1',
			display: <GuidelineTypeWeightAdjustableDisplay />,
			caption: {
				title: '다중 선택 · CENTER',
				description:
					'Light / Medium / Bold. 기존 공통 토글을 사용하며 Medium으로 시작합니다.',
			},
		},
		{
			id: 'copy',
			ratio: '1:1',
			display: (
				<GuidelineDisplayFrame>
					<div className="absolute inset-6 flex items-center justify-center text-2xl">
						HD현대
					</div>
					<GuidelineCardActions
						end={{ kind: 'copy', label: '브랜드명 복사', value: 'HD현대' }}
					/>
				</GuidelineDisplayFrame>
			),
			caption: {
				title: '복사 · END',
				description:
					'브랜드명을 복사합니다. 실행 결과에 따라 복사 완료 또는 실패 안내가 표시됩니다.',
			},
		},
	]
	if (colors.length)
		cards.push(
			{
				id: 'copy-items',
				ratio: '1:1',
				display: (
					<GuidelineDisplayFrame>
						<div className="absolute inset-0 flex">
							{colors.map((color) => (
								<GuidelineColorSwatch key={color.value} color={color} />
							))}
						</div>
						<GuidelineCardActions
							end={{
								kind: 'copy',
								label: '모든 색상값 복사',
								value: colors
									.map((color) => `${color.label}: ${color.value}`)
									.join('\n'),
							}}
						/>
					</GuidelineDisplayFrame>
				),
				caption: {
					title: '항목별 복사',
					description: '색상 항목은 해당 값만, 우측 상단 액션은 전체 목록을 복사합니다.',
				},
			},
			{
				id: 'color',
				ratio: '1:1',
				display: (
					<GuidelineLogoBackgroundDisplay
						colors={colors}
						logos={{
							black: '/brand/hd/ko-horizontal-default-blk@2x.png',
							white: '/brand/hd/ko-horizontal-default-wht@2x.png',
						}}
					/>
				),
				caption: {
					title: '색상 액션 그룹 · END',
					description:
						'프리셋 또는 직접 입력한 색상을 배경에 적용합니다. 선택한 색상은 100%, 나머지는 30% 불투명도로 표시합니다. 초기화는 첫 프리셋으로 복원합니다.',
				},
			},
		)
	return (
		<GuidelineSection id="action-vocabulary" hierarchy="main">
			<GuidelineSectionHeading
				id="action-vocabulary-heading"
				hierarchy="main"
				title="Action Vocabulary Playground"
				description="START는 상태, CENTER는 전환, END는 실행 액션입니다. 복사와 색상 선택을 직접 확인하세요."
			/>
			{colors.length === 0 && (
				<p>브랜드 색상이 등록되면 항목별 복사와 색상 선택 예시가 표시됩니다.</p>
			)}
			<GuidelineGridContainer cards={cards} columns={2} displayWidth={480} />
		</GuidelineSection>
	)
}
