import type { BrandLogo, LogoDisplayWidget as LogoDisplayWidgetRow } from '@/payload-types'

// 로고 크게 보기 위젯(서버) — 픽된 로고를 크게 중앙 정렬로 렌더한다(오버레이 없음).
// 🔑 fishing 없이 logo를 pin해서 받으므로 공유 brand-logos 풀 내용에 영향받지 않는다.
type LogoRef = number | BrandLogo | null | undefined

type Props = {
	logo: LogoRef
	padding?: number | null
}

// 카드가 준 영역 안에서 로고의 원본 비율을 유지한다.
export function LogoDisplayWidget({ logo, padding }: Props) {
	const picked = typeof logo === 'object' && logo ? logo : null
	if (!picked?.url) return null
	const alt = picked.alt ?? picked.name ?? ''
	return (
		<div className="size-full min-h-0 min-w-0" style={{ padding: padding ?? undefined }}>
			{/* biome-ignore lint/performance/noImgElement: Payload upload URL(로컬·S3)이라 next/image 미사용. */}
			<img src={picked.url} alt={alt} className="block size-full object-contain" />
		</div>
	)
}

/** 카드 디스플레이 진입점 — 자기 행을 받아 뷰로 넘긴다. `displays/registry.render.tsx`가 부른다. */
export default function LogoDisplayDisplay({ display }: { display: LogoDisplayWidgetRow }) {
	return <LogoDisplayWidget logo={display.logo} padding={display.padding} />
}
