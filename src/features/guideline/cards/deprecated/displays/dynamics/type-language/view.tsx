'use client'

import { controllerString } from '@/features/guideline/domain/controller-values'
import { useGuidelineController } from '@/features/guideline/hooks/use-guideline-controller'
import {
	BRAND_FONT_STACK,
	LANGUAGES,
	type LanguageKey,
	LEADING,
	SAMPLE_PARAGRAPH,
	TIER_SIZE,
	TIERS,
} from '../../../../displays/dynamics/brand-typeface'
import { LANGUAGE } from '../../../../displays/dynamics/type-language/manifest'

export function TypeLanguageView({
	initialLanguage,
	layout,
}: {
	initialLanguage: LanguageKey
	layout: 'single' | 'compare'
}) {
	const { values } = useGuidelineController()
	const language = controllerString(
		values,
		LANGUAGE.id,
		LANGUAGES.map((l) => l.key),
		initialLanguage,
	)
	const shown = layout === 'compare' ? LANGUAGES.map((l) => l.key) : [language]
	return (
		<div
			className="grid size-full min-h-0 min-w-0"
			style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}
		>
			{shown.map((key) => (
				<p
					key={key}
					className="min-w-0 self-center break-keep px-[8%] py-5"
					style={{
						fontFamily: BRAND_FONT_STACK,
						fontWeight: TIERS.find((t) => t.key === 'body')?.weight,
						fontSize: TIER_SIZE.body,
						lineHeight: LEADING[key].body[0] / 100,
					}}
				>
					{SAMPLE_PARAGRAPH[key].body}
				</p>
			))}
		</div>
	)
}

export default TypeLanguageView
