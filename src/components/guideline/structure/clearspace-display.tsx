'use client'

import {
	GuidelineCardActions,
	type GuidelineDisplayActions,
	useGuidelineOnOff,
} from './card-actions'
import { GuidelineDisplayFrame } from './grid'

/** 두 레이어는 동일한 캔버스 비율을 사용해야 정합됩니다. CMS 관계 대신 URL을 받습니다. */
export function GuidelineClearspaceDisplay({
	logoSrc,
	gridSrc,
	alt,
	dimBackground = false,
	actions,
}: {
	logoSrc: string
	gridSrc: string
	alt: string
	dimBackground?: boolean
	actions?: GuidelineDisplayActions
}) {
	const { enabled, toggle } = useGuidelineOnOff(`${alt} 가이드`)
	return (
		<GuidelineDisplayFrame>
			<div className="absolute inset-[10%]">
				{/* biome-ignore lint/performance/noImgElement: 동일 캔버스의 SVG·이미지 레이어를 원본으로 겹칩니다. */}
				<img
					src={logoSrc}
					alt={alt}
					className="absolute inset-0 size-full object-contain"
				/>
				{enabled && dimBackground && (
					<div
						aria-hidden="true"
						data-slot="clearspace-dimmer"
						className="pointer-events-none absolute inset-0 bg-background/80"
					/>
				)}
				{enabled && (
					// biome-ignore lint/performance/noImgElement: 보호공간 원본 레이어입니다.
					<img
						src={gridSrc}
						alt=""
						aria-hidden="true"
						data-slot="clearspace-overlay"
						className="pointer-events-none absolute inset-0 size-full object-contain"
					/>
				)}
			</div>
			<GuidelineCardActions {...actions} center={toggle} />
		</GuidelineDisplayFrame>
	)
}
