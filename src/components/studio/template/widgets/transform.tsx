'use client'

import { Controller } from '@/components/shared/controller'
import type { ControllerWidgetProps } from '@/components/studio/panel/studio-panel-slot'
import {
	IMAGE_TRANSFORM_DEFAULT,
	ImageTransformControl,
} from '@/components/studio/template/image-transform-control'
import { imageTarget } from './image-target'

/** 생성 전에는 닫힌 채 잠긴다 — compose가 배정된 이미지에만 transform을 적용해서다. */
export function TemplateTransformWidget({ cluster, scope }: ControllerWidgetProps) {
	const target = imageTarget(scope)
	if (!target.transform) return null
	// 이미지가 없으면 변형할 대상이 없어 잠근다(비활성). 잠긴 슬롯은 값을 보이되 바꾸지 못한다(읽기 전용).
	const disabled = !target.state.image
	return (
		<Controller.Group
			title={cluster.title}
			collapsible
			disabled={disabled}
			data-manager-target={`transform:${target.id}`}
			data-manager-label={target.label}
		>
			<ImageTransformControl
				value={target.state.transform ?? IMAGE_TRANSFORM_DEFAULT}
				disabled={disabled}
				readonly={target.readonly}
				limits={target.transform.limits}
				aspectRatio={target.transform.aspectRatio}
				onChange={target.transform.onChange}
			/>
		</Controller.Group>
	)
}
