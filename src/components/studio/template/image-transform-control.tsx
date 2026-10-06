'use client'

import { Controller } from '@/components/shared/controller'
import {
	IMAGE_TRANSFORM_DEFAULT,
	type ImageTransformValue,
	toImageEditTransform,
} from '@/features/template-customization/domain/image-edit-transform'
import { IMAGE_EDIT_TRANSFORM_LIMITS } from '@/lib/template-image-transform'
import { cn } from '@/lib/utils'

// 값 계약과 환산은 features가 소유한다 — 기존 소비자·테스트의 import 경로를 유지하는 재export.
export { IMAGE_TRANSFORM_DEFAULT, type ImageTransformValue, toImageEditTransform }

type ImageTransformControlProps = {
	value: ImageTransformValue
	onChange: (value: ImageTransformValue) => void
	/** compose가 transform을 배정된 이미지에만 적용하므로, 생성 전에는 비활성으로 둔다. */
	disabled?: boolean
	/** 대상 슬롯 박스의 종횡비(w/h) — 패드가 같은 비율로 그려진다. */
	aspectRatio?: number
	/** 슬롯별 조작 레인지(편집 계약 소유) — 생략하면 compose 전역 계약. 최종 clamp는 compose가 한다. */
	limits?: typeof IMAGE_EDIT_TRANSFORM_LIMITS
}

/**
 * 디자인 SSOT(1:1838)의 Image Transform 컨트롤 — 포지션 패드 + Scale·Rotate 슬라이더 행.
 * 값은 compose의 imageTransform 오버라이드로 미리보기에 합성된다(패드는 toImageEditTransform으로 px 환산).
 */
export function ImageTransformControl({
	value,
	onChange,
	disabled,
	aspectRatio,
	limits = IMAGE_EDIT_TRANSFORM_LIMITS,
}: ImageTransformControlProps) {
	// step은 이 컨트롤의 UI 밀도이고, min/max는 계약이 소유한다.
	const scaleRange = { ...limits.scale, step: 0.05 }
	const rotateRange = { ...limits.rotate, step: 1 }
	return (
		<div
			data-slot="image-transform-control"
			className={cn('flex flex-col gap-1.5', disabled && 'pointer-events-none opacity-50')}
		>
			<Controller.Pad
				aria-label="이미지 위치"
				value={{ x: value.x, y: value.y }}
				disabled={disabled}
				aspectRatio={aspectRatio}
				onChange={({ x, y }) => onChange({ ...value, x, y })}
			/>
			<Controller.Range
				label="Scale"
				value={value.scale}
				min={scaleRange.min}
				max={scaleRange.max}
				step={scaleRange.step}
				disabled={disabled}
				format={(scale) => scale.toFixed(2).replace(/\.?0+$/, '')}
				onChange={(scale) => onChange({ ...value, scale })}
			/>
			<Controller.Range
				label="Rotate"
				value={value.rotate}
				min={rotateRange.min}
				max={rotateRange.max}
				step={rotateRange.step}
				disabled={disabled}
				format={(rotate) => `${Math.round(rotate)}deg`}
				onChange={(rotate) => onChange({ ...value, rotate })}
			/>
		</div>
	)
}
