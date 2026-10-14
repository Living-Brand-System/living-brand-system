'use client'

import { useRouter } from 'next/navigation'
import { useId, useMemo, useState } from 'react'
import { parseLayers } from '@/components/admin/templates/template-layers'
import { renameTemplateLayer } from '@/components/studio/template/manager-forms/template-html-writes'
import { FormNote } from '@/components/studio/template/manager-forms/text-form'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useTemplateLayerSource } from '@/features/template-customization/hooks/use-template-layer-source'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'

/**
 * 레이어 이름 — 오른쪽 패널의 요소(CI 색 줄·이미지 칸) 폼이 맨 위에 둔다. 레이어 이름은 그 요소에서만 고친다
 * (사용자 2026-10-14). 칸을 벗어날 때 초안에 쌓는다. 텍스트 칸은 자기 폼이 칸 설정과 같이 다룬다.
 */
export function LayerNameField({ nodeId }: { nodeId: string }) {
	const { config } = useTemplateStudio()
	const router = useRouter()
	const id = useId()
	const layers = useTemplateLayerSource(config.id)
	const [error, setError] = useState<string | null>(null)
	const figmaName = useMemo(
		() =>
			layers.source
				? (parseLayers(layers.source.baseHtml).find((row) => row.id === nodeId)?.name ?? '')
				: '',
		[layers.source, nodeId],
	)
	if (!layers.source) return <FormNote error={layers.error} loading />
	const label = layers.source.overrides[nodeId]?.label ?? ''
	return (
		<Field className="gap-1">
			<FieldLabel htmlFor={`${id}-name`}>레이어 이름</FieldLabel>
			<Input
				id={`${id}-name`}
				defaultValue={label}
				placeholder={figmaName}
				onKeyDown={(event) => {
					if (event.key === 'Enter') event.currentTarget.blur()
				}}
				onBlur={(event) => {
					const value = event.currentTarget.value.trim()
					if (value === label) return
					setError(null)
					renameTemplateLayer(config.id, nodeId, value)
						.then(() => {
							layers.reload()
							router.refresh()
						})
						.catch((cause: unknown) =>
							setError(
								cause instanceof Error
									? cause.message
									: '레이어 이름을 바꾸지 못했어요.',
							),
						)
				}}
			/>
			<FieldDescription className="text-xs">
				Layers 목록과 인쇄 PDF의 레이어 이름이에요. 비우면 Figma 이름을 써요.
			</FieldDescription>
			<FormNote error={error} />
		</Field>
	)
}
