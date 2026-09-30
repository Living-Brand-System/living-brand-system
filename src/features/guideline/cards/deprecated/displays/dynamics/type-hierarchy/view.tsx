'use client'

import { useGuidelineController } from '@/features/guideline/hooks/use-guideline-controller'
import {
	BRAND_FONT_STACK,
	type LanguageKey,
	LEADING,
	SAMPLE_PARAGRAPH,
	TIER_SIZE,
	TIERS,
} from '../../../../displays/dynamics/brand-typeface'

/** 표본만 그린다. 문구 편집은 카드 컨트롤러, 규정값은 카드 캡션이 표시한다. */
export function TypeHierarchyView({ language }: { language: LanguageKey }) {
	const { values } = useGuidelineController()
	return (
		<div
			className="flex size-full min-h-0 min-w-0 flex-col justify-center gap-5 px-[8%] py-6"
			style={{ containerType: 'inline-size' }}
		>
			{TIERS.map((tier) => (
				<p
					key={tier.key}
					className="whitespace-pre-wrap break-keep"
					style={{
						fontFamily: BRAND_FONT_STACK,
						fontWeight: tier.weight,
						fontSize: `clamp(${Math.max(Math.round(TIER_SIZE[tier.key] * 0.45), 12)}px, ${(TIER_SIZE[tier.key] / 640) * 100}cqi, ${TIER_SIZE[tier.key]}px)`,
						lineHeight: LEADING[language][tier.key][0] / 100,
					}}
				>
					{typeof values[tier.key] === 'string'
						? String(values[tier.key])
						: SAMPLE_PARAGRAPH[language][tier.key]}
				</p>
			))}
		</div>
	)
}
