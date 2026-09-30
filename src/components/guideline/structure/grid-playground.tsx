'use client'

import { useState } from 'react'
import { GuidelineSection, GuidelineSectionHeading } from './components'
import {
	DISPLAY_RATIOS,
	DISPLAY_WIDTHS,
	type DisplayRatio,
	type DisplayWidth,
	type GridColumns,
	GuidelineCardDisplay,
	GuidelineGridContainer,
} from './grid'

const assets = [
	{ file: 'icon-container-ship-filled.webp', title: '컨테이너선' },
	{ file: 'icon-excavator-filled.webp', title: '굴착기' },
	{ file: 'icon-gantry-crane-filled.webp', title: '갠트리 크레인' },
	{ file: 'icon-gas-station-filled.webp', title: '주유소' },
	{ file: 'icon-industrial-robot-filled.webp', title: '산업용 로봇' },
]
const base = '/guideline/reference/grid/'

export function GuidelineGridPlayground() {
	const [displayWidth, setWidth] = useState<DisplayWidth>(480)
	const [ratio, setRatio] = useState<DisplayRatio>('1:1')
	const [columns, setColumns] = useState<GridColumns>(3)
	const [count, setCount] = useState(5)
	const [fit, setFit] = useState<'contain' | 'cover'>('contain')
	const [scale, setScale] = useState(80)
	return (
		<>
			<GuidelineSection id="grid-playground" hierarchy="main">
				<GuidelineSectionHeading
					id="grid-playground-heading"
					hierarchy="main"
					title="Grid Playground"
					description="카드 크기와 비율을 바꾸고 화면을 좁혀 배치를 확인하세요. 빈 열은 유지됩니다."
				/>
				<div
					data-slot="guideline-grid-playground"
					className="flex flex-wrap gap-6 rounded-lg bg-muted p-6 text-sm [&_select]:rounded-md [&_select]:border [&_select]:border-border [&_select]:bg-background [&_select]:p-2 [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-ring"
				>
					<label className="flex flex-col gap-2">
						목표 너비
						<select
							value={displayWidth}
							onChange={(e) => setWidth(Number(e.target.value) as DisplayWidth)}
						>
							{DISPLAY_WIDTHS.map((value) => (
								<option key={value} value={value}>
									{value}px
								</option>
							))}
						</select>
					</label>
					<label className="flex flex-col gap-2">
						Display 비율
						<select
							value={ratio}
							onChange={(e) => setRatio(e.target.value as DisplayRatio)}
						>
							{DISPLAY_RATIOS.map((value) => (
								<option key={value}>{value}</option>
							))}
						</select>
					</label>
					<label className="flex flex-col gap-2">
						최대 열 수
						<select
							value={columns}
							onChange={(e) => setColumns(Number(e.target.value) as GridColumns)}
						>
							{[1, 2, 3, 4, 5].map((value) => (
								<option key={value}>{value}</option>
							))}
						</select>
					</label>
					<label className="flex flex-col gap-2">
						카드 수
						<select value={count} onChange={(e) => setCount(Number(e.target.value))}>
							{[1, 2, 3, 4, 5].map((value) => (
								<option key={value}>{value}</option>
							))}
						</select>
					</label>
					<label className="flex flex-col gap-2">
						이미지 맞춤
						<select
							value={fit}
							onChange={(e) => setFit(e.target.value as 'contain' | 'cover')}
						>
							<option value="contain">Contain</option>
							<option value="cover">Cover</option>
						</select>
					</label>
					{fit === 'contain' && (
						<label className="flex flex-col gap-2">
							스케일 {scale}%
							<input
								aria-label="Contain 스케일"
								type="range"
								min={30}
								max={100}
								value={scale}
								onChange={(e) => setScale(Number(e.target.value))}
								className="accent-primary focus-visible:outline-2 focus-visible:outline-ring"
							/>
						</label>
					)}
				</div>
				<GuidelineGridContainer
					displayWidth={displayWidth}
					columns={columns}
					cards={assets.slice(0, count).map(({ file, title }) => ({
						id: file,
						ratio,
						display: (
							<GuidelineCardDisplay
								src={`${base}${file}`}
								alt={title}
								sizes={`(max-width: ${displayWidth}px) 100vw, ${displayWidth}px`}
								{...(fit === 'cover'
									? { fit: 'cover' as const }
									: { fit: 'contain' as const, scale })}
							/>
						),
						caption: {
							title,
							description:
								file === assets[0].file
									? '설명이 길어져도 Display의 크기와 비율은 유지됩니다. 다음 행은 가장 긴 카드 아래에서 시작합니다.'
									: undefined,
						},
					}))}
				/>
			</GuidelineSection>
			<GuidelineSection id="grid-fit" hierarchy="sub">
				<GuidelineSectionHeading
					id="grid-fit-heading"
					hierarchy="sub"
					title="Contain · Cover 비교"
					description="같은 에셋에 Contain 80%와 Cover를 적용합니다."
				/>
				<GuidelineGridContainer
					columns={2}
					cards={[
						{
							id: 'contain',
							ratio: '1:1',
							display: (
								<GuidelineCardDisplay
									src={`${base}application-brochure-body-01.webp`}
									alt="브로슈어 본문 전체"
								/>
							),
							caption: { title: 'Contain · 80%' },
						},
						{
							id: 'cover',
							ratio: '1:1',
							display: (
								<GuidelineCardDisplay
									src={`${base}application-brochure-body-01.webp`}
									alt="브로슈어 본문 확대"
									fit="cover"
								/>
							),
							caption: { title: 'Cover · 100%' },
						},
					]}
				/>
			</GuidelineSection>
		</>
	)
}
