'use client'

import { useState } from 'react'
import { GuidelineCarouselContainer } from './carousel'
import { GuidelineSection, GuidelineSectionHeading } from './components'
import { DISPLAY_RATIOS, type DisplayRatio, GuidelineCardDisplay } from './grid'

const examples = [
	{ id: 'ship', file: 'icon-container-ship-filled.webp', title: '컨테이너선', ratio: '1:1' },
	{ id: 'brochure', file: 'application-brochure-body-01.webp', title: '브로슈어', ratio: '16:9' },
	{ id: 'crane', file: 'icon-gantry-crane-filled.webp', title: '갠트리 크레인', ratio: '2:3' },
	{ id: 'robot', file: 'icon-industrial-robot-filled.webp', title: '산업용 로봇', ratio: '4:3' },
	{ id: 'excavator', file: 'icon-excavator-filled.webp', title: '굴착기', ratio: '3:4' },
] satisfies { id: string; file: string; title: string; ratio: DisplayRatio }[]

export function GuidelineCarouselPlayground() {
	const [loop, setLoop] = useState(true)
	const [autoplay, setAutoplay] = useState(false)
	const [height, setHeight] = useState<240 | 320 | 480 | 720>(320)
	const [count, setCount] = useState(5)
	const [ratio, setRatio] = useState<'mixed' | DisplayRatio>('mixed')
	return (
		<GuidelineSection id="carousel-playground" hierarchy="main">
			<GuidelineSectionHeading
				id="carousel-playground-heading"
				hierarchy="main"
				title="Carousel Playground"
				description="서로 다른 비율의 카드를 넘겨보세요. 좁은 화면에서는 모든 카드가 온전히 보이도록 공통 높이가 줄어듭니다."
			/>
			<div
				data-slot="guideline-carousel-playground"
				className="flex flex-wrap gap-6 rounded-lg bg-muted p-6 text-sm [&_select]:rounded-md [&_select]:border [&_select]:border-border [&_select]:bg-background [&_select]:p-2 [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-ring"
			>
				<label className="flex flex-col gap-2">
					목표 높이
					<select
						value={height}
						onChange={(e) => setHeight(Number(e.target.value) as typeof height)}
					>
						{[240, 320, 480, 720].map((value) => (
							<option key={value} value={value}>
								{value}px
							</option>
						))}
					</select>
				</label>
				<label className="flex flex-col gap-2">
					캐러셀 카드 수
					<select value={count} onChange={(e) => setCount(Number(e.target.value))}>
						{[0, 1, 2, 3, 4, 5].map((value) => (
							<option key={value}>{value}</option>
						))}
					</select>
				</label>
				<label className="flex flex-col gap-2">
					카드 비율
					<select
						value={ratio}
						onChange={(e) => setRatio(e.target.value as typeof ratio)}
					>
						<option value="mixed">혼합 비율</option>
						{DISPLAY_RATIOS.map((value) => (
							<option key={value}>{value}</option>
						))}
					</select>
				</label>
				<label className="flex flex-col gap-2">
					무한 반복
					<select
						value={String(loop)}
						onChange={(e) => setLoop(e.target.value === 'true')}
					>
						<option value="false">OFF</option>
						<option value="true">ON</option>
					</select>
				</label>
				<label className="flex flex-col gap-2">
					자동 재생
					<select
						value={String(autoplay)}
						onChange={(e) => setAutoplay(e.target.value === 'true')}
					>
						<option value="false">OFF</option>
						<option value="true">ON</option>
					</select>
				</label>
			</div>
			<p className="text-sm text-muted-foreground">
				재생 간격은 3초입니다. 카드가 부족하면 무한 반복이 해제됩니다. 자동 재생은 마우스
				진입·드래그·포커스·화살표 조작 시 정지하며, 시작 버튼으로 다시 재생할 수 있습니다.
				모션 감소 설정에서는 자동 재생하지 않습니다.
			</p>
			<GuidelineCarouselContainer
				label="혼합 비율 카드 예시"
				displayHeight={height}
				loop={loop}
				autoplay={autoplay}
				cards={examples.slice(0, count).map((item) => ({
					id: item.id,
					ratio: ratio === 'mixed' ? item.ratio : ratio,
					display: (
						<GuidelineCardDisplay
							src={`/guideline/reference/grid/${item.file}`}
							alt={item.title}
							sizes="(max-width: 768px) 100vw, 1280px"
						/>
					),
					caption: {
						title: item.title,
						description: `${ratio === 'mixed' ? item.ratio : ratio}${item.id === 'ship' ? ' · 설명 길이가 달라도 디스플레이 높이는 같습니다. 컨트롤은 가장 긴 캡션 아래에 놓입니다.' : ''}`,
					},
				}))}
			/>
		</GuidelineSection>
	)
}
