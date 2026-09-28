'use client'

import { useState } from 'react'
import type { GuidelineCaption } from './caption'
import { GuidelineSection, GuidelineSectionHeading } from './components'
import {
	DISPLAY_RATIOS,
	type DisplayRatio,
	type GuidelineCardData,
	GuidelineCardDisplay,
} from './grid'
import { GuidelineStickyContainer } from './sticky'

const examples = [
	{
		id: 'ship',
		title: 'Container Ship',
		description: '컨테이너선의 형태와 비례를 확인합니다.',
		file: 'icon-container-ship-filled.webp',
		value: '80%',
		ratio: '1:1',
	},
	{
		id: 'crane',
		title: 'Gantry Crane',
		description: '크레인의 수직 구조와 여백을 확인합니다.',
		file: 'icon-gantry-crane-filled.webp',
		value: '60%',
		ratio: '2:3',
	},
	{
		id: 'robot',
		title: 'Industrial Robot',
		description: '산업용 로봇의 관절과 실루엣을 확인합니다.',
		file: 'icon-industrial-robot-filled.webp',
		value: '70%',
		ratio: '16:9',
	},
]

export function GuidelineStickyPlayground() {
	const [captionType, setCaptionType] = useState<'basic' | 'list' | 'specification'>(
		'specification',
	)
	const [top, setTop] = useState(32)
	const [ratio, setRatio] = useState<'mixed' | DisplayRatio>('mixed')
	const cards: GuidelineCardData[] = examples.map((item) => ({
		id: item.id,
		ratio: ratio === 'mixed' ? (item.ratio as DisplayRatio) : ratio,
		caption: {
			title: item.title,
			description: item.description,
			...(captionType === 'basic'
				? { type: 'basic' as const }
				: captionType === 'list'
					? {
							type: 'list' as const,
							items: [
								{
									title: '형태',
									description: '원본의 비례와 실루엣을 유지합니다.',
								},
								{
									title: '여백',
									description: '주변 콘텐츠와 충분한 간격을 확보합니다.',
								},
							],
						}
					: {
							type: 'specification' as const,
							groups: [
								{
									title: 'Display',
									items: [
										{
											label: 'Ratio',
											value: ratio === 'mixed' ? item.ratio : ratio,
										},
										{ label: 'Fit', value: 'Contain' },
									],
								},
								{
									title: 'Image',
									items: [
										{ label: 'Scale', value: item.value },
										{ label: 'Alignment', value: 'Center' },
									],
								},
							],
						}),
		} satisfies GuidelineCaption,
		display: (
			<GuidelineCardDisplay
				src={`/guideline/reference/grid/${item.file}`}
				alt={item.title}
				scale={Number.parseInt(item.value, 10)}
				sizes="(max-width: 850px) 100vw, 997px"
			/>
		),
	}))
	return (
		<>
			<GuidelineSection id="sticky-playground" hierarchy="main">
				<GuidelineSectionHeading
					id="sticky-playground-heading"
					hierarchy="main"
					title="Sticky Playground"
					description="일반형과 스크롤 전환형을 비교하세요. 좁은 화면에서는 캡션 전체 → 도판 순서로 표시합니다. 예시 문구와 수치는 비교용 목업입니다."
				/>
				<div className="flex flex-wrap gap-6">
					<label className="flex max-w-48 flex-col gap-2 text-sm">
						Sticky 캡션 형태
						<select
							className="rounded-md border border-border bg-background p-2 focus-visible:outline-2 focus-visible:outline-ring"
							value={captionType}
							onChange={(e) => setCaptionType(e.target.value as typeof captionType)}
						>
							<option value="basic">기본형</option>
							<option value="list">목록형</option>
							<option value="specification">명세형</option>
						</select>
					</label>
					<label className="flex max-w-48 flex-col gap-2 text-sm">
						고정 위치
						<select
							className="rounded-md border border-border bg-background p-2 focus-visible:outline-2 focus-visible:outline-ring"
							value={top}
							onChange={(e) => setTop(Number(e.target.value))}
						>
							{[32, 80, 160].map((value) => (
								<option key={value} value={value}>
									상단 {value}px
								</option>
							))}
						</select>
					</label>
					<label className="flex max-w-48 flex-col gap-2 text-sm">
						Sticky 카드 판형
						<select
							className="rounded-md border border-border bg-background p-2 focus-visible:outline-2 focus-visible:outline-ring"
							value={ratio}
							onChange={(e) => setRatio(e.target.value as typeof ratio)}
						>
							<option value="mixed">혼합 · 1:1 / 2:3 / 16:9</option>
							{DISPLAY_RATIOS.map((value) => (
								<option key={value}>{value}</option>
							))}
						</select>
					</label>
				</div>
			</GuidelineSection>
			{(['individual', 'switch'] as const).map((mode) => (
				<GuidelineSection key={mode} id={`sticky-${mode}`} hierarchy="sub">
					<GuidelineSectionHeading
						id={`sticky-${mode}-heading`}
						hierarchy="sub"
						title={mode === 'individual' ? '일반 Sticky' : '스크롤 전환형 Sticky'}
						description={
							mode === 'individual'
								? '각 설명이 자기 카드 안에서 고정되며, 카드 끝에서 함께 올라갑니다.'
								: '다음 도판의 상단이 고정 위치를 통과하면 왼쪽 설명이 바뀝니다.'
						}
					/>
					<GuidelineStickyContainer cards={cards} mode={mode} top={top} />
				</GuidelineSection>
			))}
		</>
	)
}
