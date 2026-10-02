import { ArrowUpRight, Checkmark, Close, Download, Renew } from '@carbon/icons-react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { expect, it, vi } from 'vitest'
import { GuidelineCardActions, useGuidelineOnOff } from './card-actions'
import { GuidelineSection, GuidelineSectionHeading } from './components'
import { GuidelineCardDisplay, GuidelineGridContainer } from './grid'

vi.mock('next/image', () => ({
	default: ({ fill: _fill, alt, ...props }: Record<string, unknown>) => (
		// biome-ignore lint/performance/noImgElement: next/image 테스트 대역입니다.
		<img alt={String(alt)} {...props} />
	),
}))

it('토글 상태는 카드별로 독립적이고 배지·링크·버튼은 각 의미대로 동작한다', () => {
	const { container } = render(<GuidelineCardActionsPlayground />)
	expect(
		container.querySelector('[data-position="start"] button, [data-position="start"] a'),
	).toBeNull()
	expect(
		container.querySelector(
			'[data-position="end"] [data-slot="badge"], [data-position="end"] [data-slot="toggle-group"]',
		),
	).toBeNull()
	expect(
		container.querySelectorAll('[data-position="center"] [data-slot="toggle-group"]'),
	).toHaveLength(2)
	const group = screen.getByLabelText('center 표시 방식')
	const plate = group.querySelector('[data-slot="guideline-card-toggle-backplate"]')
	expect(plate).not.toBeNull()
	fireEvent.click(within(group).getByRole('radio', { name: 'On' }))
	expect(container.querySelectorAll('[data-slot="mock-grid-overlay"]')).toHaveLength(1)
	expect(group.querySelector('[data-slot="guideline-card-toggle-backplate"]')).toBe(plate)
	fireEvent.click(within(group).getByRole('radio', { name: 'On' }))
	expect(within(group).getByRole('radio', { name: 'On' })).toHaveAttribute('aria-checked', 'true')
	fireEvent.click(within(group).getByRole('radio', { name: 'Off' }))
	expect(container.querySelector('[data-slot="mock-grid-overlay"]')).toBeNull()
	fireEvent.click(screen.getByRole('button', { name: '이미지 크기 전환' }))
	expect(screen.getByAltText('크기 전환 예시')).toHaveStyle({ transform: 'scale(0.3)' })
	expect(screen.getByRole('img', { name: '금지' }).tagName).toBe('SPAN')
	expect(screen.getAllByRole('link', { name: '컨테이너선 다운로드' })[0]).toHaveAttribute(
		'download',
	)
	expect(screen.getByRole('link', { name: '원본 이미지 열기' })).not.toHaveAttribute('download')
})

it('복사 완료는 2초 뒤 아이콘으로 돌아가고 재복사하면 시간을 다시 센다', async () => {
	vi.useFakeTimers()
	const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
	Object.defineProperty(navigator, 'clipboard', {
		configurable: true,
		value: { writeText: vi.fn().mockResolvedValue(undefined) },
	})
	const { unmount } = render(
		<GuidelineCardActions end={{ kind: 'copy', label: '테스트 복사', value: 'HD' }} />,
	)
	try {
		const button = screen.getByRole('button', { name: '테스트 복사' })
		await act(async () => {
			fireEvent.click(button)
		})
		expect(button).toHaveTextContent('Copied')
		act(() => vi.advanceTimersByTime(1500))
		await act(async () => {
			fireEvent.click(button)
		})
		act(() => vi.advanceTimersByTime(1999))
		expect(button).toHaveTextContent('Copied')
		act(() => vi.advanceTimersByTime(1))
		expect(button).not.toHaveTextContent('Copied')
		expect(button.querySelector('svg')).not.toBeNull()
		await act(async () => {
			fireEvent.click(button)
		})
		unmount()
		expect(vi.getTimerCount()).toBe(0)
	} finally {
		unmount()
		if (original) Object.defineProperty(navigator, 'clipboard', original)
		else Reflect.deleteProperty(navigator, 'clipboard')
		vi.useRealTimers()
	}
})

/** 실제 공용 액션을 조합한 테스트 대역 — 지운 가이드라인 목업의 조합을 그대로 옮겼다. */
const src = '/guideline/reference/grid/icon-container-ship-filled.webp'
function GuidelineCardActionsPlayground() {
	const center = useGuidelineOnOff('center 표시 방식')
	const overlap = useGuidelineOnOff('overlap 표시 방식')
	const [scale, setScale] = useState(80)
	const download = {
		kind: 'link' as const,
		label: '컨테이너선 다운로드',
		href: src,
		download: true,
		icon: <Download size={18} />,
	}
	return (
		<GuidelineSection id="card-actions" hierarchy="main">
			<GuidelineSectionHeading
				id="card-actions-heading"
				hierarchy="main"
				title="Card Actions"
				description="상태 배지, 다운로드, 링크와 토글을 확인하세요. Off / On으로 격자를 숨기거나 표시합니다."
			/>
			<GuidelineGridContainer
				displayWidth={320}
				columns={3}
				cards={[
					{
						id: '0',
						ratio: '1:1',
						display: (
							<GuidelineCardDisplay src={src} alt="권장 사용 예시">
								<GuidelineCardActions
									start={{
										kind: 'badge',
										label: '권장',
										variant: 'success',
										icon: <Checkmark size={20} />,
									}}
									end={download}
								/>
							</GuidelineCardDisplay>
						),
						caption: { title: '권장 · 다운로드' },
					},
					{
						id: '1',
						ratio: '1:1',
						display: (
							<GuidelineCardDisplay src={src} alt="금지 사용 예시">
								<GuidelineCardActions
									start={{
										kind: 'badge',
										label: '금지',
										variant: 'destructive',
										icon: <Close size={24} />,
									}}
									end={{
										kind: 'link',
										label: '원본 이미지 열기',
										href: src,
										icon: <ArrowUpRight size={20} />,
									}}
								/>
							</GuidelineCardDisplay>
						),
						caption: { title: '금지 · 원본 링크' },
					},
					{
						id: '2',
						ratio: '1:1',
						display: (
							<GuidelineCardDisplay src={src} alt="크기 전환 예시" scale={scale}>
								<GuidelineCardActions
									end={{
										kind: 'button',
										label: '이미지 크기 전환',
										icon: <Renew size={17} />,
										onClick: () =>
											setScale((value) => (value === 80 ? 30 : 80)),
									}}
									start={{
										kind: 'badge',
										label: '권장',
										variant: 'success',
										icon: <Checkmark size={20} />,
									}}
								/>
							</GuidelineCardDisplay>
						),
						caption: {
							title: '권장 · 크기 전환',
							description: `현재 스케일 ${scale}%`,
						},
					},
					{
						id: '3',
						ratio: '1:1',
						display: (
							<GuidelineCardDisplay src={src} alt="center 토글 예시">
								{center.enabled && <GridOverlay />}
								<GuidelineCardActions center={center.toggle} />
							</GuidelineCardDisplay>
						),
						caption: { title: 'Toggle · CENTER' },
					},
				]}
			/>
			<GuidelineGridContainer
				displayWidth={240}
				columns={1}
				cards={[
					{
						id: '0',
						ratio: '1:1',
						display: (
							<GuidelineCardDisplay src={src} alt="240px 겹침 예시">
								{overlap.enabled && <GridOverlay />}
								<GuidelineCardActions
									start={{
										kind: 'badge',
										label: '권장',
										variant: 'success',
										icon: <Checkmark size={20} />,
									}}
									center={overlap.toggle}
									end={download}
								/>
							</GuidelineCardDisplay>
						),
						caption: {
							title: '240px · 동시 배치',
							description: '중앙 고정, 겹침 허용',
						},
					},
				]}
			/>
		</GuidelineSection>
	)
}

function GridOverlay() {
	return (
		<div
			data-slot="mock-grid-overlay"
			aria-hidden="true"
			className="pointer-events-none absolute inset-6 grid grid-cols-3 grid-rows-3 border-t border-l border-foreground/20"
		>
			{['a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'c1', 'c2', 'c3'].map((cell) => (
				<span key={cell} className="border-r border-b border-foreground/20" />
			))}
		</div>
	)
}
