import type { StaticDisplay as StaticDisplayType } from '@/payload-types'

/** 배경 이미지 하나. 판(비율·둥근 모서리·clip)은 카드가 소유하고 여기는 채우기만 한다. */
export function StaticDisplay({ display, alt }: { display: StaticDisplayType; alt?: string }) {
	const image = typeof display.image === 'object' ? display.image : null
	if (!image?.url) return null
	return (
		// biome-ignore lint/performance/noImgElement: Payload upload URL(로컬·S3)이라 next/image 미사용.
		<img
			src={image.url}
			alt={image.alt ?? alt ?? image.name ?? ''}
			className="absolute inset-0 size-full object-cover"
		/>
	)
}

export default StaticDisplay
