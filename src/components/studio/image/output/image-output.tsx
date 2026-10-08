'use client'

import { Copy, Crop, SquareOutline } from '@carbon/icons-react'
import { useId } from 'react'
import { Controller, ControllerStack } from '@/components/shared/controller'
import { StudioOutput } from '@/components/studio/shared/studio-output'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field'
import type {
	ImageAspectRatio,
	ImageOutputSize,
} from '@/features/image-generation/domain/image-size'
import { getImageStudioControls } from '@/features/image-generation/domain/image-studio-config'
import { useImageStudio } from '@/features/image-generation/hooks/use-image-studio'
import type { ImageExportView } from '@/features/studio-export/hooks/use-image-export'
import { resolveControlAvailability } from '@/modules/studio-controller/controller-definition'

/**
 * 이미지 Output 카드 — 좌측 세 상자 중 맨 아래(사용자 지시, 2026-09-21).
 *
 * 🔴 장수·비율·해상도와 내보내기를 **쪼개지 않는다**(사용자 지시, 2026-09-22). 우측 사이드바의
 *    Setting 블록을 통째로 옮겨 온 것이고, 한때 내보내기만 떼어 왔던 것을 되돌린 상태다.
 */
export function ImageOutput({ download }: { download: ImageExportView }) {
	const { view } = download
	return (
		<StudioOutput.Root
			footer={
				<>
					<StudioOutput.Actions
						save={view.save}
						busy={view.busy}
						action={<GenerateButton />}
					/>
					<StudioOutput.Messages error={view.error} notices={view.notices} />
				</>
			}
		>
			<ImageGenerationFields />
			<StudioOutput.Format {...view.format} />
			{view.print && <StudioOutput.Print {...view.print} />}
			{view.video && <StudioOutput.Video {...view.video} />}
		</StudioOutput.Root>
	)
}

/** 생성 — 저장 위에 놓는 결과를 만드는 동작. 시점 변경이 켜져 있으면 참조 이미지를 다른 각도로 다시 그린다. */
function GenerateButton() {
	const { generation, camera } = useImageStudio()
	const canRun = camera.enabled ? Boolean(camera.seedImage) : generation.canRun
	return (
		<Button
			variant="muted"
			className="h-11 w-full rounded-lg bg-foreground/10 text-foreground hover:bg-foreground/15"
			disabled={generation.busy || !canRun}
			onClick={camera.enabled ? camera.regenerate : generation.run}
		>
			{generation.busy ? '생성 중…' : '이미지 생성'}
		</Button>
	)
}

/** 장수·비율·해상도 — 발행 계약(선택지·availability)대로 그린다. 선택지가 하나면 읽기 전용이다. */
function ImageGenerationFields() {
	const { config, controls, generation } = useImageStudio()
	const errorIdPrefix = useId()
	const { batch, ratio, resolution } = getImageStudioControls(config)
	const fields = [
		{
			definition: batch,
			icon: <Copy />,
			value: String(generation.batch),
			onChange: (value: string) => generation.setBatch(Number(value)),
		},
		{
			definition: ratio,
			icon: <SquareOutline />,
			value: generation.ratio,
			onChange: (value: string) => generation.setRatio(value as ImageAspectRatio),
		},
		{
			definition: resolution,
			icon: <Crop />,
			value: generation.resolution,
			onChange: (value: string) => generation.setResolution(value as ImageOutputSize),
		},
	]
	return (
		<ControllerStack
			items={fields.map(({ definition, icon, value, onChange }) => {
				const binding = controls.bindings[definition.id]
				const availability = resolveControlAvailability(definition, binding)
				const readonly =
					availability === 'readonly' ||
					(availability !== 'disabled' && definition.options.length <= 1)
				const errorId = binding?.error ? `${errorIdPrefix}-${definition.id}` : undefined
				return {
					id: definition.id,
					errorId,
					label: definition.label,
					icon,
					disabled: availability === 'disabled',
					readonly,
					children: (
						<>
							{readonly ? (
								<span className="text-sm text-muted-foreground">{value}</span>
							) : (
								<Controller.Select
									options={definition.options}
									value={value}
									onChange={onChange}
								/>
							)}
							{binding?.error && (
								<FieldError id={errorId}>{binding.error}</FieldError>
							)}
						</>
					),
				}
			})}
		/>
	)
}
