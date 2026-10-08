'use client'

import type { ControllerWidgetProps } from '@/components/studio/panel/studio-panel-slot'
import { ColorPairWidget } from '@/components/studio/shared/widgets/color-pair'
import { imageTarget } from './image-target'

/** 프로파일이 바뀌면 고른 모드·스와치를 처음부터 본다 — 슬롯 패널은 남은 채 계약만 바뀐다. */
export function TemplateImageColorPairWidget(props: ControllerWidgetProps) {
	return (
		<ColorPairWidget {...props} identity={String(imageTarget(props.scope).state.profileId)} />
	)
}
