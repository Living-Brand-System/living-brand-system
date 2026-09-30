import type {
	BrandLogo,
	ClearspaceViewerWidget as ClearspaceViewerWidgetRow,
} from '@/payload-types'
import { type ClearspacePanel, ClearspaceViewerView } from './view'

// 클리어스페이스 뷰어(서버) — 가로/세로 레이어 URL을 뽑아 패널 배열로 클라 뷰에 넘긴다.
type LogoRef = number | BrandLogo | null | undefined
function u(r: LogoRef): string | null {
	return r && typeof r === 'object' ? (r.url ?? null) : null
}

export function ClearspaceViewerWidget({
	horizontalLogo,
	horizontalGrid,
	horizontalMinHeightPx,
	verticalLogo,
	verticalGrid,
	verticalMinHeightPx,
}: {
	horizontalLogo: LogoRef
	horizontalGrid: LogoRef
	horizontalMinHeightPx?: number | null
	verticalLogo: LogoRef
	verticalGrid: LogoRef
	verticalMinHeightPx?: number | null
}) {
	const panels: ClearspacePanel[] = []
	const hLogo = u(horizontalLogo)
	if (hLogo) {
		panels.push({
			label: '가로형',
			logo: hLogo,
			grid: u(horizontalGrid),
			minHeightPx: horizontalMinHeightPx ?? null,
		})
	}
	const vLogo = u(verticalLogo)
	if (vLogo) {
		panels.push({
			label: '세로형',
			logo: vLogo,
			grid: u(verticalGrid),
			minHeightPx: verticalMinHeightPx ?? null,
		})
	}
	if (panels.length === 0) return null
	return <ClearspaceViewerView panels={panels} />
}

/** 카드 디스플레이 진입점 — 자기 행을 받아 뷰로 넘긴다. `displays/registry.render.tsx`가 부른다. */
export default function ClearspaceViewerDisplay({
	display,
}: {
	display: ClearspaceViewerWidgetRow
}) {
	return (
		<ClearspaceViewerWidget
			horizontalLogo={display.horizontalLogo}
			horizontalGrid={display.horizontalGrid}
			horizontalMinHeightPx={display.horizontalMinHeightPx}
			verticalLogo={display.verticalLogo}
			verticalGrid={display.verticalGrid}
			verticalMinHeightPx={display.verticalMinHeightPx}
		/>
	)
}
