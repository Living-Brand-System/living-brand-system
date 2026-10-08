'use client'

import type * as React from 'react'
import { cn } from '@/lib/utils'
import { ControllerRow } from '../compose/row'
import { ControllerSelect } from './select'

type ControllerCameraAxis = {
	/** 축 라벨(X·Y) — Row 자동 배선으로 셀렉트의 접근 가능한 이름이 된다. */
	label: string
	options: readonly { value: string; label: string }[]
	value: string
	onChange: (value: string) => void
}

type ControllerCameraControlProps = {
	/** 3D 오빗 프리뷰(CameraOrbitControl 등) — 정사각 컨테이너에 담긴다. */
	children: React.ReactNode
	/** 프리뷰 아래 반폭으로 나란히 앉는 축 셀렉트들. */
	axes: readonly ControllerCameraAxis[]
	/** Compound 표면 안에서는 축 컨트롤에 6px 인셋을 둔다. */
	contained?: boolean
}

/**
 * 카메라 컨트롤(디자인 4:5858) — 정사각 프리뷰 + 반폭 축 셀렉트 스택.
 * 프리뷰 렌더러(three.js 오빗)는 소비자가 children으로 넣는다 — 킷은 배치 언어만 소유한다.
 */
export function ControllerCameraControl({
	children,
	axes,
	contained = false,
}: ControllerCameraControlProps) {
	return (
		<div
			data-slot="controller-camera-control"
			className={cn('flex flex-col', contained ? 'gap-1' : 'gap-1.5')}
		>
			<div
				className={cn(
					'aspect-square w-full shrink-0 overflow-hidden bg-muted',
					contained ? 'rounded-md' : 'rounded-lg',
				)}
			>
				{children}
			</div>
			<div className={cn('grid grid-cols-2 gap-1.5', contained && 'p-1.5')}>
				{axes.map((axis) => (
					<ControllerRow
						key={axis.label}
						label={axis.label}
						className={contained ? 'rounded-md bg-foreground/4' : undefined}
					>
						<ControllerSelect
							options={axis.options}
							value={axis.value}
							onChange={axis.onChange}
						/>
					</ControllerRow>
				))}
			</div>
		</div>
	)
}
