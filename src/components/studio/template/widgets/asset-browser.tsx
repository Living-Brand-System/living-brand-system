'use client'

import type { ControllerWidgetProps } from '@/components/studio/panel/studio-panel-slot'
import { SampleImageGrid } from '@/components/studio/shared/sample-image-grid'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import { imageTarget } from './image-target'

/** 샘플 이미지 하나를 고른다(`asset-browser` 묶음). */
export function TemplateSamplesWidget({ scope }: ControllerWidgetProps) {
	const { sampleImages } = useTemplateStudio()
	const target = imageTarget(scope)
	const sample = target.state.image?.kind === 'sample' ? target.state.image : undefined
	return (
		<SampleImageGrid
			images={sampleImages}
			layout="inline"
			isCurrent={(option) => option.id === sample?.sampleImageId}
			onSelect={target.onSample}
		/>
	)
}
