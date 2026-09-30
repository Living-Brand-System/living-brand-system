'use client'

import { type ReactNode, useState } from 'react'
import { DisplayFit } from '@/features/guideline/cards/displays/display-fit'
import {
	AVAILABLE_WEIGHTS,
	BRAND_FONT_STACK,
	type LanguageKey,
	LEADING,
	WEIGHT_SAMPLE,
	WEIGHT_SAMPLE_BODY,
	WEIGHTS,
	type WeightKey,
} from '@/features/guideline/cards/displays/dynamics/brand-typeface'
import { GuidelineCardActions, type GuidelineDisplayActions } from './card-actions'
import { GuidelineDisplayContent, GuidelineDisplayFrame } from './grid'

/** Artboard 43의 최소 460px 표본과 36/20px 조판을 유지하고 도판에 맞춰 함께 축소합니다. */
export function GuidelineTypeWeightDisplay({
	language = 'ko',
	languages,
	className,
	weight = 'medium',
	actions,
}: {
	language?: LanguageKey
	languages?: readonly [LanguageKey, ...LanguageKey[]]
	className?: string
	weight?: WeightKey
	actions?: ReactNode
}) {
	const selected = WEIGHTS.find((item) => item.key === weight) ?? WEIGHTS[1]
	return (
		<GuidelineDisplayFrame className={className}>
			<GuidelineDisplayContent className="absolute inset-0">
				<DisplayFit>
					<div className="flex flex-col gap-12">
						{[...new Set(languages ?? [language])].map((language) => (
							<div
								key={language}
								lang={language === 'ko' ? 'ko' : 'en'}
								data-slot="type-weight-specimen"
								className="flex w-max min-w-[460px] flex-col gap-6 px-6 py-8 text-inherit"
								style={{ fontFamily: BRAND_FONT_STACK, fontWeight: selected.value }}
							>
								<p
									className="whitespace-pre"
									style={{
										fontSize: 36,
										lineHeight: LEADING[language].head[0] / 100,
									}}
								>
									{WEIGHT_SAMPLE[language]}
								</p>
								<p
									className="whitespace-pre"
									style={{
										fontSize: 20,
										lineHeight: LEADING[language].body[0] / 100,
									}}
								>
									{WEIGHT_SAMPLE_BODY[language]}
								</p>
								{!AVAILABLE_WEIGHTS.includes(selected.value) && (
									<p role="status" className="text-xs text-destructive">
										{selected.label}({selected.value})는 서체 파일이 없어
										브라우저가 대신 그린 굵기입니다.
									</p>
								)}
							</div>
						))}
					</div>
				</DisplayFit>
			</GuidelineDisplayContent>
			{actions}
		</GuidelineDisplayFrame>
	)
}

/** 실제 제공되는 세 굵기를 비교합니다. 조작 영역은 도판 축소 대상에서 제외합니다. */
export function GuidelineTypeWeightAdjustableDisplay({
	language = 'ko',
	languages,
	weight: initialWeight = 'medium',
	actions,
}: {
	language?: LanguageKey
	languages?: readonly [LanguageKey, ...LanguageKey[]]
	weight?: WeightKey
	actions?: GuidelineDisplayActions
}) {
	const [weight, setWeight] = useState<WeightKey>(initialWeight)
	return (
		<GuidelineTypeWeightDisplay
			language={language}
			languages={languages}
			weight={weight}
			actions={
				<GuidelineCardActions
					{...actions}
					center={{
						kind: 'toggle',
						label: '서체 굵기',
						value: weight,
						options: WEIGHTS.map((item) => ({ value: item.key, label: item.label })),
						onValueChange: (value) => {
							const next = WEIGHTS.find((item) => item.key === value)
							if (next) setWeight(next.key)
						},
					}}
				/>
			}
		/>
	)
}
