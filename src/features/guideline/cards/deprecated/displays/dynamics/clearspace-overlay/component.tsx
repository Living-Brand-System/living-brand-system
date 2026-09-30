import type {
	BrandLogo,
	ClearspaceOverlayWidget as ClearspaceOverlayWidgetRow,
} from '@/payload-types'

// [임시] 클리어스페이스 오버레이(서버) — 로고 레이어 위에 그리드 레이어를 정확히 겹친다.
// 두 레이어는 동일 viewBox(px scale 일치)라, 같은 박스에 렌더하면 정합. 카드가 준 같은 영역 안에서 비율을 유지한다.
type LogoRef = number | BrandLogo | null | undefined
function layerUrl(r: LogoRef): string | null {
	return r && typeof r === 'object' ? (r.url ?? null) : null
}

export function ClearspaceOverlayWidget({
	logoLayer,
	gridLayer,
}: {
	logoLayer: LogoRef
	gridLayer: LogoRef
}) {
	const logo = layerUrl(logoLayer)
	const grid = layerUrl(gridLayer)
	if (!logo) return null
	return (
		<div className="relative size-full min-h-0 min-w-0">
			{/* 동일 viewBox인 두 레이어에 같은 contain 배치를 적용한다. */}
			{/* biome-ignore lint/performance/noImgElement: Payload upload URL이라 next/image 미사용. */}
			<img src={logo} alt="" className="absolute inset-0 size-full object-contain" />
			{/* 그리드 레이어: 같은 박스를 채워 정확히 오버레이(동일 viewBox). */}
			{grid ? (
				// biome-ignore lint/performance/noImgElement: Payload upload URL이라 next/image 미사용.
				<img src={grid} alt="" className="absolute inset-0 size-full object-contain" />
			) : null}
		</div>
	)
}

/** 카드 디스플레이 진입점 — 자기 행을 받아 뷰로 넘긴다. `displays/registry.render.tsx`가 부른다. */
export default function ClearspaceOverlayDisplay({
	display,
}: {
	display: ClearspaceOverlayWidgetRow
}) {
	return <ClearspaceOverlayWidget logoLayer={display.logoLayer} gridLayer={display.gridLayer} />
}
