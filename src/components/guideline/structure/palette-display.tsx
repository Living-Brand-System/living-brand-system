import type { ComponentProps } from 'react'
import type { PaletteGroup } from '@/features/guideline/domain/contract/palette'
import type { GuidelineDisplayActions } from './card-actions'
import { GuidelineColorPaletteDisplay } from './color-displays'
import { GuidelineLogoOnBackgroundDisplay } from './logo-on-background-display'

export type GuidelinePaletteDisplayProps = {
	groups: readonly PaletteGroup[]
	actions?: GuidelineDisplayActions
} & (
	| { variant: 'swatches'; layout?: 'uniform' | 'ranked'; logos?: never }
	| {
			variant: 'logo-backgrounds'
			logos: ComponentProps<typeof GuidelineLogoOnBackgroundDisplay>['logos']
			layout?: never
	  }
)

/** 색상 계약을 공유하고 표현에 필요한 입력만 받는다. */
export function GuidelinePaletteDisplay(props: GuidelinePaletteDisplayProps) {
	return props.variant === 'swatches' ? (
		<GuidelineColorPaletteDisplay
			groups={props.groups}
			layout={props.layout}
			actions={props.actions}
		/>
	) : (
		<GuidelineLogoOnBackgroundDisplay
			groups={props.groups}
			logos={props.logos}
			actions={props.actions}
		/>
	)
}
