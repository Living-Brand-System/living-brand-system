import { GuidelineHelperRegion } from '@/components/guideline/deprecated/controllers/helper'
import { GuidelineControllerPill } from '@/components/guideline/deprecated/controllers/pill'
import type { DisplayData } from '@/features/guideline/domain/contract/display'
import { cn } from '@/lib/utils'
import { displayDefinition } from '../../displays/registry'
import { renderDisplay } from '../../displays/registry.render'

/** 정적 이미지 또는 동적 표본을 카드 안에 놓고, 조작 가능한 표본만 활성 영역으로 등록한다. */
export function CardDisplay({
	display,
	title,
	controllerLabel,
}: {
	display: DisplayData
	title?: string | null
	controllerLabel?: string
}) {
	if (
		display.blockType === 'typeScrambleWidget' ||
		display.blockType === 'logoColorVariantWidget'
	)
		return null
	const definition = displayDefinition(display.blockType)
	if (definition.type === 'static') return renderDisplay(display, { alt: title ?? undefined })
	return (
		<div
			data-slot="card-display"
			data-display-type={definition.type}
			data-display-category={definition.category}
			data-display-sizing={definition.sizing}
			className={cn(
				'absolute inset-0 overflow-clip',
				definition.inset === '10%' && 'inset-[10%]',
			)}
		>
			{controllerLabel !== undefined ? (
				<GuidelineHelperRegion
					className="absolute inset-0"
					label={title ?? controllerLabel}
					controls={<GuidelineControllerPill />}
				>
					{renderDisplay(display)}
				</GuidelineHelperRegion>
			) : (
				renderDisplay(display)
			)}
		</div>
	)
}
