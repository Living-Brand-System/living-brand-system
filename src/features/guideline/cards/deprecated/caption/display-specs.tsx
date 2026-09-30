'use client'

import { GUIDELINE_TYPOGRAPHY } from '@/components/guideline/deprecated/typography/guideline-typography'
import { GuidelineSpecTable } from '@/components/guideline/deprecated/typography/spec-table'
import { Typography } from '@/components/ui/typography'
import type { DisplayData } from '@/features/guideline/domain/contract/display'
import { controllerNumber, controllerString } from '@/features/guideline/domain/controller-values'
import { useGuidelineController } from '@/features/guideline/hooks/use-guideline-controller'
import { LANGUAGES, LEADING, TIER_SIZE, TIERS } from '../../displays/dynamics/brand-typeface'
import { OVERLAY_CONTROLS } from '../../displays/dynamics/layout-grid-overlay/manifest'
import { LANGUAGE } from '../../displays/dynamics/type-language/manifest'

/** 언어 카드는 블록 제목 대신 현재 언어를 캡션 제목으로 표시한다. */
export function TypeLanguageCaptionTitle({
	display,
}: {
	display: Extract<DisplayData, { blockType: 'typeLanguageWidget' }>
}) {
	const { values } = useGuidelineController()
	const language = controllerString(
		values,
		LANGUAGE.id,
		LANGUAGES.map((l) => l.key),
		display.initialLanguage ?? 'ko',
	)
	return LANGUAGES.find((l) => l.key === language)?.label
}

/** 데이터는 규정·현재 조작값에서 읽고 CMS 캡션에 되써 넣지 않는다. */
export function DisplaySpecs({ display }: { display: DisplayData }) {
	const { values } = useGuidelineController()
	if (display.blockType === 'typeHierarchyWidget') {
		const language = display.language ?? 'ko'
		return (
			<div className="flex flex-col gap-2.5">
				{TIERS.map((tier) => {
					const [min, max] = LEADING[language][tier.key]
					return (
						<div key={tier.key}>
							<Typography as="p" {...GUIDELINE_TYPOGRAPHY.specLabel}>
								{tier.label}
							</Typography>
							<GuidelineSpecTable
								rows={[
									[
										'규정 크기',
										`${TIER_SIZE[tier.key]}px (좁은 영역에서는 축소)`,
									],
									['굵기', tier.weight],
									['행간', `${min}–${max}% · ${min}% 적용`],
								]}
							/>
						</div>
					)
				})}
			</div>
		)
	}
	if (display.blockType === 'typeLanguageWidget') {
		const language = controllerString(
			values,
			LANGUAGE.id,
			LANGUAGES.map((l) => l.key),
			display.initialLanguage ?? 'ko',
		)
		const [min, max] = LEADING[language].body
		return (
			<GuidelineSpecTable
				rows={[
					['크기', `${TIER_SIZE.body}px`],
					['굵기', TIERS.find((t) => t.key === 'body')?.weight],
					['행간', `${min}–${max}% · ${min}% 적용`],
				]}
			/>
		)
	}
	if (display.blockType === 'layoutGridOverlayWidget')
		return (
			<GuidelineSpecTable
				rows={[
					...OVERLAY_CONTROLS.filter((c) => c.kind === 'range').map(
						(c) =>
							[
								c.label,
								`${controllerNumber(values, c.id, Number(c.defaultValue))}${c.id === 'padding' || c.id === 'gap' ? 'px' : ''}`,
							] as const,
					),
					['기준', '원본 이미지 좌표 · 이미지별로 비율 유지'],
					['적용', '패딩·갭은 셀 크기 안으로 제한'],
				]}
			/>
		)
	return null
}
