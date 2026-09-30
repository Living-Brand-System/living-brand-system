'use client'

import { useState } from 'react'
import {
	LANGUAGES,
	type LanguageKey,
	LEADING,
	WEIGHTS,
} from '@/features/guideline/cards/displays/dynamics/brand-typeface'
import { GuidelineCarouselContainer } from './carousel'
import { GuidelineSection, GuidelineSectionHeading } from './components'
import {
	DISPLAY_RATIOS,
	type DisplayRatio,
	type GuidelineCardData,
	GuidelineGridContainer,
} from './grid'
import { GuidelineStickyContainer } from './sticky'
import {
	GuidelineTypeWeightAdjustableDisplay,
	GuidelineTypeWeightDisplay,
} from './type-weight-display'

// Figma Typography / Caption 160:9789의 본문 명세 항목과 순서입니다.
const specification = (language: LanguageKey) => ({
	title: language === 'ko' ? 'Korean' : language === 'en' ? 'English' : 'English (All Caps)',
	items: [
		{ label: 'Kerning', value: 'Auto' },
		{ label: 'Scale', value: '100%' },
		{ label: 'Leading', value: `${LEADING[language].body[0]} – ${LEADING[language].body[1]}%` },
		{ label: 'Baseline', value: '0pt' },
	],
})

export function GuidelineTypeWeightPlayground() {
	const [language, setLanguage] = useState<LanguageKey>('ko')
	const [ratio, setRatio] = useState<DisplayRatio>('1:1')
	const cards: GuidelineCardData[] = WEIGHTS.map((weight) => ({
		id: weight.key,
		ratio,
		display: <GuidelineTypeWeightDisplay language={language} weight={weight.key} />,
		caption: {
			type: 'specification',
			groups: [specification(language)],
			title: `${weight.label} · ${weight.value}`,
			description: `${LANGUAGES.find((item) => item.key === language)?.label} 굵기 표본`,
		},
	}))
	cards.push({
		id: 'adjustable',
		ratio,
		display: <GuidelineTypeWeightAdjustableDisplay language={language} />,
		caption: {
			type: 'specification',
			title: 'Specification',
			description: '국문·영문 본문 조판 기준',
			groups: [specification('ko'), specification('en')],
		},
	})

	return (
		<GuidelineSection id="type-weight-playground" hierarchy="main">
			<GuidelineSectionHeading
				id="type-weight-playground-heading"
				hierarchy="main"
				title="Type Weight Playground"
				description="같은 언어·판형의 Light, Medium, Bold를 비교합니다. Figma의 제목·설명·언어별 명세를 공통 캡션으로 조합했습니다. 명세는 본문 기준이며 Scale 100%는 글자 비율입니다. 작은 도판에서는 표본 전체를 함께 축소합니다."
			/>
			<div className="flex flex-wrap gap-6 text-sm [&_select]:rounded-md [&_select]:border [&_select]:border-border [&_select]:bg-background [&_select]:p-2 [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-ring">
				<label className="flex flex-col gap-2">
					표본 언어
					<select
						value={language}
						onChange={(e) => setLanguage(e.target.value as LanguageKey)}
					>
						{LANGUAGES.map((item) => (
							<option key={item.key} value={item.key}>
								{item.label}
							</option>
						))}
					</select>
				</label>
				<label className="flex flex-col gap-2">
					표본 판형
					<select
						value={ratio}
						onChange={(e) => setRatio(e.target.value as DisplayRatio)}
					>
						{DISPLAY_RATIOS.map((item) => (
							<option key={item}>{item}</option>
						))}
					</select>
				</label>
			</div>
			<GuidelineGridContainer cards={cards} displayWidth={320} columns={3} />
			<GuidelineCarouselContainer cards={cards} label="서체 굵기 비교" />
			<GuidelineStickyContainer cards={cards} />
		</GuidelineSection>
	)
}
