'use client'

import { ArrowUpRight, Checkmark, Close, Download, Renew } from '@carbon/icons-react'
import { useState } from 'react'
import { GuidelineCardActions, useGuidelineOnOff } from './card-actions'
import { GuidelineSection, GuidelineSectionHeading } from './components'
import { GuidelineCardDisplay, GuidelineGridContainer } from './grid'

const src = '/guideline/reference/grid/icon-container-ship-filled.webp'
export function GuidelineCardActionsPlayground() {
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
