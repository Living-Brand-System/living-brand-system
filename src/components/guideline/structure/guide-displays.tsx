'use client'

import type { ComponentProps } from 'react'
import {
	type CiLockupFixed,
	CiLockupView,
} from '@/features/guideline/cards/deprecated/displays/dynamics/ci-lockup/view'
import { LayoutGridWidget } from '@/features/guideline/cards/deprecated/displays/dynamics/layout-grid/component'
import { LayoutGridOverlay } from '@/features/guideline/cards/deprecated/displays/dynamics/layout-grid-overlay/view'
import {
	GUTTER_X,
	GUTTER_Y,
	MARGIN,
} from '@/features/guideline/cards/displays/dynamics/layout-grid/manifest'
import type { LayoutGridSample } from '@/features/guideline/cards/displays/dynamics/layout-grid/samples'
import type {
	ImageSpec,
	LayoutParams,
} from '@/features/guideline/cards/displays/dynamics/layout-grid-overlay/geometry'
import { guideColorOf } from '@/features/guideline/cards/displays/guide-style'
import {
	GuidelineCardActions,
	type GuidelineCardBreadcrumb,
	type GuidelineDisplayActions,
	useGuidelineOnOff,
} from './card-actions'
import { GuidelineDisplayFrame } from './grid'

export function GuidelineLayoutOverlayDisplay({
	images,
	params,
	colors = {},
	actions,
}: {
	images: ImageSpec[]
	params?: Partial<LayoutParams>
	colors?: Record<string, string>
	actions?: GuidelineDisplayActions
}) {
	const { enabled, toggle } = useGuidelineOnOff('레이아웃 오버레이')
	return (
		<GuidelineDisplayFrame>
			<div className="absolute inset-4">
				<LayoutGridOverlay
					images={images}
					defaults={params}
					accent={guideColorOf(colors)}
					guidesOn={enabled}
				/>
			</div>
			<GuidelineCardActions {...actions} center={toggle} />
		</GuidelineDisplayFrame>
	)
}

export function GuidelineLayoutGridDisplay({
	colors = {},
	actions,
	sample = 'a',
	margin = MARGIN.defaultValue,
	gutterX = GUTTER_X.defaultValue,
	gutterY = GUTTER_Y.defaultValue,
}: {
	sample?: LayoutGridSample
	colors?: Record<string, string>
	actions?: GuidelineDisplayActions
	margin?: number
	gutterX?: number
	gutterY?: number
}) {
	const { enabled, toggle } = useGuidelineOnOff('레이아웃 배치 가이드')
	return (
		<GuidelineDisplayFrame>
			<div className="absolute inset-4">
				<LayoutGridWidget
					guideColor={guideColorOf(colors)}
					sample={sample}
					guides={enabled ? 'on' : 'off'}
					marginPct={margin}
					gutterX={gutterX}
					gutterY={gutterY}
				/>
			</div>
			<GuidelineCardActions {...actions} center={toggle} />
		</GuidelineDisplayFrame>
	)
}

export function GuidelineCiLockupDisplay({
	colors,
	fixed = {},
	breadcrumb,
	end,
}: {
	colors: Record<string, string>
	fixed?: CiLockupFixed
	breadcrumb?: GuidelineCardBreadcrumb
	end?: ComponentProps<typeof GuidelineCardActions>['end']
}) {
	const { enabled, toggle } = useGuidelineOnOff('CI 조합 치수')
	return (
		<GuidelineDisplayFrame>
			<div className="absolute inset-4">
				<CiLockupView
					framed={false}
					colors={colors}
					fixed={{
						...fixed,
						measured: true,
						clearSpace: 'off',
						hiddenControls: [
							'h',
							'subsidiaryOn',
							'subsidiary',
							'branchOn',
							'branch',
							'form',
							'language',
							'colorType',
							'mono',
							'clearSpace',
							'measured',
						],
					}}
					diagramVisible={enabled}
					showDownload={false}
				/>
			</div>
			<GuidelineCardActions center={breadcrumb ?? toggle} end={end} />
		</GuidelineDisplayFrame>
	)
}
