'use client'

import { useEffect, useState } from 'react'
import { Controller } from '@/components/shared/controller'
import {
	CI_VARIANTS,
	type CiVariantOption,
	findCiVariantOptions,
} from '@/features/template-core/domain/ci-variants'
import { requestPublishedBrandLogos } from '@/features/template-core/services/template-editor-options.client'
import type { TemplateNodeConfig } from '@/types/template'

/**
 * CI 레이어의 세부 설정 — 같은 「CI 모양」의 색 버전 중 하나를 고른다. 고르면 그 로고 파일이 그대로 끼워진다.
 * `logoId`는 지금 화면에 끼워진 로고다(가져오기가 인식한 것 또는 앞서 고른 것).
 */
export function VectorLayerEditor({
	logoId,
	onChange,
}: {
	logoId?: number
	onChange: (patch: TemplateNodeConfig) => void
}) {
	const [options, setOptions] = useState<CiVariantOption[] | null>(null)
	const [loadError, setLoadError] = useState(false)

	useEffect(() => {
		if (logoId === undefined) return
		const controller = new AbortController()
		void requestPublishedBrandLogos(controller.signal)
			.then((logos) =>
				setOptions(
					findCiVariantOptions(
						logos.flatMap((logo) => (logo.url ? [{ ...logo, url: logo.url }] : [])),
						logoId,
					),
				),
			)
			.catch((error: unknown) => {
				if ((error as { name?: string }).name !== 'AbortError') setLoadError(true)
			})
		return () => controller.abort()
	}, [logoId])

	const current = options?.find((option) => option.id === logoId)
	return (
		<Controller.Group
			title="세부 설정"
			collapsible={false}
			// template-layer-editors의 layerTypeTag와 같은 태그 — 그 파일은 @payloadcms/ui를 물고
			// 있어 vitest에서 import할 수 없으므로(전이 css) 여기선 span을 직접 그린다.
			trailing={<span className="text-muted-foreground text-xs">CI</span>}
		>
			{options && options.length > 0 ? (
				<Controller.Row label="색상">
					<Controller.Segmented
						aria-label="색상"
						options={options.map(({ variant }) => ({
							value: variant,
							label:
								CI_VARIANTS.find(({ value }) => value === variant)?.label ??
								variant,
						}))}
						value={current?.variant ?? ''}
						onChange={(variant) => {
							const option = options.find((item) => item.variant === variant)
							if (!option) return
							onChange({
								vectorAsset: {
									collection: 'brand-logos',
									id: option.id,
									src: option.src,
								},
							})
						}}
					/>
				</Controller.Row>
			) : (
				options && (
					<p className="text-muted-foreground text-sm">
						이 로고에는 고를 색 버전이 없습니다. 「로고」에서 CI 모양·CI 색상을
						지정하세요.
					</p>
				)
			)}
			{logoId === undefined && (
				<p className="text-muted-foreground text-sm">
					등록된 로고로 인식되지 않은 레이어입니다.
				</p>
			)}
			{loadError && (
				<p className="text-destructive text-sm">로고 목록을 불러오지 못했습니다.</p>
			)}
		</Controller.Group>
	)
}
