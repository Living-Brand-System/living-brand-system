'use client'

import {
	GuidelineCardActions,
	type GuidelineDisplayActions,
	useGuidelineOnOff,
} from './card-actions'
import { GuidelineDisplayFrame } from './grid'

/**
 * 이미지 위에 흰색 80% 막을 얹은 것과 같은 색(0.2x + 0.8)을 이미지 픽셀에만 만든다.
 * contrast(1/9)가 0.111x + 0.444, brightness(1.8)이 그것을 0.2x + 0.8로 옮긴다.
 * 🔴 막 div를 겹치지 말 것 — object-contain 이미지의 여백까지 덮어 카드 양옆이 흰 띠가 된다.
 */
const DIM_TO_WHITE = 'contrast(0.1111) brightness(1.8)'

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
					style={enabled && dimBackground ? { filter: DIM_TO_WHITE } : undefined}
				/>
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
