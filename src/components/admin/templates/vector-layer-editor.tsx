'use client'

import { useEffect, useState } from 'react'
import { Controller } from '@/components/shared/controller'
import { usePublishedBrandColorValues } from '@/features/template-core/hooks/use-published-brand-color-values'
import {
	requestPublishedTemplateVectorAssets,
	type TemplateVectorAsset,
} from '@/features/template-core/services/template-editor-options.client'
import type { TemplateNodeConfig } from '@/types/template'

/** '원본' 선택값 — 자산 값(`collection:id`)과 겹치지 않는 sentinel. */
const ORIGINAL = 'original'

export function VectorLayerEditor({
	config,
	onChange,
}: {
	config: TemplateNodeConfig
	onChange: (patch: TemplateNodeConfig) => void
}) {
	const [assets, setAssets] = useState<TemplateVectorAsset[]>([])
	const [loadError, setLoadError] = useState(false)
	const { values: colorValues, loadError: colorLoadError } = usePublishedBrandColorValues()

	useEffect(() => {
		const controller = new AbortController()
		void requestPublishedTemplateVectorAssets(controller.signal)
			.then(setAssets)
			.catch((error: unknown) => {
				if ((error as { name?: string }).name !== 'AbortError') setLoadError(true)
			})

		return () => controller.abort()
	}, [])

	const assetValue = config.vectorAsset
		? `${config.vectorAsset.collection}:${config.vectorAsset.id}`
		: ORIGINAL
	const assetOptions = [
		{ value: ORIGINAL, label: '원본' },
		...assets.flatMap((asset) =>
			asset.url
				? [
						{
							value: `${asset.collection}:${asset.id}`,
							label: `${asset.collection === 'brand-logos' ? '로고' : '이미지'} — ${asset.name}`,
						},
					]
				: [],
		),
	]
	return (
		<Controller.Group
			title="세부 설정"
			collapsible={false}
			// template-layer-editors의 layerTypeTag와 같은 태그 — 그 파일은 @payloadcms/ui를 물고
			// 있어 vitest에서 import할 수 없으므로(전이 css) 여기선 span을 직접 그린다.
			trailing={<span className="text-muted-foreground text-xs">벡터</span>}
		>
			<Controller.Row label="사용할 그래픽">
				<Controller.Select
					options={assetOptions}
					value={assetValue}
					onChange={(value) => {
						if (value === ORIGINAL) {
							onChange({ vectorAsset: undefined })
							return
						}
						const asset = assets.find(
							(item) => `${item.collection}:${item.id}` === value,
						)
						if (asset?.url) {
							onChange({
								vectorAsset: {
									collection: asset.collection,
									id: asset.id,
									src: asset.url,
								},
							})
						}
					}}
				/>
			</Controller.Row>
			<Controller.Row label="맞춤 방식">
				<Controller.Segmented
					aria-label="맞춤 방식"
					options={[
						{ value: 'fill', label: 'Fill' },
						{ value: 'contain', label: 'Contain' },
					]}
					value={config.vectorFit ?? 'fill'}
					onChange={(value) => onChange({ vectorFit: value })}
				/>
			</Controller.Row>
			<Controller.ColorRow
				label="사용할 브랜드 컬러"
				value={config.vectorColor ?? ''}
				isEmpty={!config.vectorColor}
				onReset={() => onChange({ vectorColor: undefined })}
				values={colorValues}
				onChange={(hex) => onChange({ vectorColor: hex })}
			/>
			{loadError && (
				<p className="text-destructive text-sm">브랜드 자산을 불러오지 못했습니다.</p>
			)}
			{colorLoadError && (
				<p className="text-destructive text-sm">브랜드 컬러를 불러오지 못했습니다.</p>
			)}
		</Controller.Group>
	)
}
