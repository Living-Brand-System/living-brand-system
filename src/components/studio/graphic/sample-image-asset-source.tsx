'use client'

import { Controller } from '@/components/shared/controller'
import { SampleImageGrid } from '@/components/studio/shared/sample-image-grid'
import {
	fetchSampleImages,
	type SampleImageOption,
} from '@/features/template-customization/services/list-sample-images.client'
import { useLazyResource } from '@/hooks/use-lazy-resource'

/** 빈 목록의 신원을 고정한다 — 렌더마다 새 배열을 만들면 useMemo가 매번 다시 돈다. */
const NO_OPTIONS: readonly SampleImageOption[] = []

/**
 * `asset` control의 `sample-images` 출처 구현 — 킷(AssetCard·Browser)이 크롬을, 이 파일이 도메인을 갖는다.
 *
 * 🔑 값은 **URL 문자열**이다. `ControllerControlValue`가 객체를 담지 못하기도 하고, 런타임이
 *    필요로 하는 것도 id가 아니라 그릴 수 있는 주소 하나뿐이다.
 * 🔴 목록을 Definition에 넣지 않는다 — 넣으면 정의가 업로드된 자산에 묶여 환경마다 달라진다.
 */
export function SampleImageAssetSource({
	label,
	value,
	disabled,
	onChange,
}: {
	label: string
	value: string | null
	disabled?: boolean
	onChange: (value: string | null) => void
}) {
	const images = useLazyResource(fetchSampleImages)
	const options = images.data ?? NO_OPTIONS
	const selected = options.find((option) => option.url === value)

	return (
		<Controller.AssetCard
			title={selected?.name ?? (value ? '고른 이미지' : '이미지를 선택하세요')}
			subtitle={label}
			buttonLabel={value ? 'Change' : 'Browse'}
			aria-label={`${label} 선택`}
			tabs={['Sample Images']}
			panelSide="right"
			previewImage={
				selected
					? { url: selected.thumbnailUrl, alt: selected.alt }
					: value
						? { url: value, alt: label }
						: undefined
			}
			disabled={disabled}
		>
			<SampleImageGrid
				images={images}
				layout="browser"
				isCurrent={(option) => option.url === value}
				onSelect={(option) => onChange(option.url)}
				onClear={{ current: value === null, select: () => onChange(null) }}
			/>
		</Controller.AssetCard>
	)
}
