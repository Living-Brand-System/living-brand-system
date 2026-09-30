'use client'

import { controllerBoolean, controllerNumber } from '@/features/guideline/domain/controller-values'
import { useGuidelineController } from '@/features/guideline/hooks/use-guideline-controller'
import {
	type ImageSpec,
	type LayoutParams,
	overlayGeometry,
} from '../../../../displays/dynamics/layout-grid-overlay/geometry'
import { OVERLAY_CONTROLS } from '../../../../displays/dynamics/layout-grid-overlay/manifest'
import { GUIDE_LINE_WIDTH } from '../../../../displays/guide-style'

export function LayoutGridOverlay({
	images,
	defaults,
	accent,
	guidesOn: guidesOverride,
}: {
	images: ImageSpec[]
	defaults?: Partial<LayoutParams>
	accent: string
	guidesOn?: boolean
}) {
	const { values } = useGuidelineController()
	const read = (id: keyof LayoutParams) =>
		controllerNumber(
			guidesOverride === undefined ? values : {},
			id,
			defaults?.[id] ??
				Number(OVERLAY_CONTROLS.find((control) => control.id === id)?.defaultValue),
		)
	const params = {
		sections: read('sections'),
		columns: read('columns'),
		padding: read('padding'),
		gap: read('gap'),
	}
	const guidesOn = guidesOverride ?? controllerBoolean(values, 'guidesOn', true)
	return (
		<div className="flex size-full min-h-0 min-w-0 gap-4">
			{images.map((image) => {
				const g = overlayGeometry(image, params)
				return (
					<svg
						key={image.src}
						className="h-full min-w-0 flex-1"
						viewBox={`0 0 ${g.width} ${g.height}`}
						preserveAspectRatio="xMidYMid meet"
						role="img"
						aria-label="레이아웃 이미지와 격자"
					>
						<title>레이아웃 이미지와 격자</title>
						<image
							href={image.src}
							width={g.width}
							height={g.height}
							opacity={guidesOn ? 0.5 : 1}
						/>
						{guidesOn &&
							Array.from({ length: g.sections }, (_, row) =>
								Array.from({ length: g.columns }, (_, col) => (
									<rect
										// biome-ignore lint/suspicious/noArrayIndexKey: 행·열 좌표가 격자 셀의 정체성이다.
										key={`${row}-${col}`}
										x={g.padding + col * (g.colWidth + g.gap)}
										y={row * g.sectionHeight + g.padding}
										width={g.colWidth}
										height={g.sectionHeight - 2 * g.padding}
										fill="none"
										stroke={accent}
										strokeWidth={GUIDE_LINE_WIDTH}
										vectorEffect="non-scaling-stroke"
									/>
								)),
							)}
					</svg>
				)
			})}
		</div>
	)
}
