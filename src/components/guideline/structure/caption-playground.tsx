import type { GuidelineCaption } from './caption'
import { GuidelineCarouselContainer } from './carousel'
import { GuidelineSection, GuidelineSectionHeading } from './components'
import { GuidelineCardDisplay, GuidelineGridContainer } from './grid'
import { GuidelineStickyContainer } from './sticky'

const captions: GuidelineCaption[] = [
	{ type: 'basic', title: '기본형 · 제목만' },
	{
		type: 'basic',
		title: '기본형 · 제목과 설명',
		description: '도판을 설명하는 문장입니다. 내용에 따라 캡션 높이가 자연스럽게 늘어납니다.',
	},
	{
		type: 'list',
		title: '목록형',
		description: '관련 지침을 순서대로 묶습니다.',
		items: [
			{ title: '형태', description: '원본 비례를 유지합니다.' },
			{ title: '여백', description: '주변 콘텐츠와 충분한 간격을 확보합니다.' },
		],
	},
	{
		type: 'specification',
		title: '명세형',
		description: '여러 명세 그룹을 하나의 캡션에 담습니다.',
		groups: [
			{
				title: 'Display',
				items: [
					{ label: 'Ratio', value: '1:1' },
					{ label: 'Fit', value: 'Contain' },
				],
			},
			{
				title: 'Image',
				items: [
					{ label: 'Scale', value: '80%' },
					{ label: 'Alignment', value: 'Center' },
				],
			},
		],
	},
]

export function GuidelineCaptionPlayground() {
	const cards = captions.map((caption, index) => ({
		id: String(index),
		ratio: '1:1' as const,
		caption,
		display: (
			<GuidelineCardDisplay
				src="/guideline/reference/grid/icon-container-ship-filled.webp"
				alt={`캡션 비교 ${index + 1}`}
			/>
		),
	}))
	return (
		<GuidelineSection id="caption-playground" hierarchy="main">
			<GuidelineSectionHeading
				id="caption-playground-heading"
				hierarchy="main"
				title="Caption Playground"
				description="같은 네 예시를 Grid·Carousel·Sticky에서 비교합니다. 캡션 내부 스펙은 동일하며, 아래 내용은 비교용 목업입니다."
			/>
			<GuidelineGridContainer displayWidth={320} columns={4} cards={cards} />
			<GuidelineCarouselContainer label="캡션 형태 비교" cards={cards} displayHeight={320} />
			<GuidelineStickyContainer cards={cards} />
		</GuidelineSection>
	)
}
