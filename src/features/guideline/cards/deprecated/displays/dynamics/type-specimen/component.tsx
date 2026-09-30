'use client'

import { controllerNumber, controllerString } from '@/features/guideline/domain/controller-values'
import { useGuidelineController } from '@/features/guideline/hooks/use-guideline-controller'
import { THEME_PANEL } from '../../../../displays/dynamics/surface'
import {
	ALIGN,
	LEADING,
	TIER,
	TIER_PRESETS,
} from '../../../../displays/dynamics/type-specimen/manifest'

/** 관계 조회가 없는 표본. 컨트롤과 문구 상태는 카드 스코프에서 읽는다. */
export function TypeSpecimenWidget() {
	const { values } = useGuidelineController()
	const tier = controllerString(
		values,
		TIER.id,
		Object.keys(TIER_PRESETS) as (keyof typeof TIER_PRESETS)[],
		TIER.defaultValue,
	)
	const align = controllerString(
		values,
		ALIGN.id,
		ALIGN.options.map((option) => option.value),
		ALIGN.defaultValue,
	)
	const lineHeight = controllerNumber(values, LEADING.id, LEADING.defaultValue)
	const text = typeof values[tier] === 'string' ? values[tier] : TIER_PRESETS[tier].fallback
	return (
		<div className={`flex size-full min-h-0 min-w-0 flex-col rounded-lg p-8 ${THEME_PANEL}`}>
			<p
				data-slot="type-specimen-text"
				className="min-h-0 w-full whitespace-pre-wrap break-keep text-foreground"
				style={{
					fontFamily: 'var(--font-title)',
					fontSize: TIER_PRESETS[tier].size,
					lineHeight,
					textAlign: align,
				}}
			>
				{text}
			</p>
		</div>
	)
}

export default function TypeSpecimenDisplay() {
	return <TypeSpecimenWidget />
}
