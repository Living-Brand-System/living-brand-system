'use client'

import type { ControllerWidgetProps } from '@/components/studio/panel/studio-panel-slot'
import { SampleImagePicker } from '@/components/studio/template/sample-image-picker'
import { imageTarget } from './image-target'

/** 샘플 이미지 하나를 고른다(`asset-browser` 묶음). */
export function TemplateSamplesWidget({ scope }: ControllerWidgetProps) {
	const target = imageTarget(scope)
	const sample = target.state.image?.kind === 'sample' ? target.state.image : undefined
	return (
		<SampleImagePicker inline selectedId={sample?.sampleImageId} onSelect={target.onSample} />
	)
}
