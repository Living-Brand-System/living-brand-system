import config from '@payload-config'
import { getPayload } from 'payload'
import layoutBaseImage from '../../../../displays/dynamics/layout-grid-overlay/images/layout_base_image_1.webp'
import layoutBaseImage2 from '../../../../displays/dynamics/layout-grid-overlay/images/layout_base_image_2.webp'
import { LayoutGridOverlay } from './view'

// 위젯(서버): brand-colors에서 그리드 가이드 accent(메인 hero hex)를 뽑아 클라 view에 주입.
// 샘플 이미지는 "같은 규격 리플릿" 전제라 정적 2장 고정(임의 application-images 부적합).
// author 인스턴스 없이 자족 렌더 — 프레임/텍스트는 컨테이너 Block이 소유하므로 위젯은 시각만.
export async function LayoutGridOverlayWidget() {
	const payload = await getPayload({ config })
	const { docs } = await payload.find({ collection: 'brand-colors', limit: 200, depth: 0 })
	// ponytail: 데이터 0건 fallback만 리터럴. 정상 경로는 전부 컬렉션 hex.
	const accent = docs.find((c) => c.isMain && c.tone != null)?.hex ?? docs[0]?.hex ?? '#000000'

	const images = [layoutBaseImage, layoutBaseImage2].map((img) => ({
		src: img.src,
		width: img.width,
		height: img.height,
	}))

	return (
		<LayoutGridOverlay
			images={images}
			accent={accent}
			defaults={{ sections: 3, columns: 4, padding: 24, gap: 16 }}
		/>
	)
}

/** 카드 디스플레이 진입점 — 자기 행을 받아 뷰로 넘긴다. `displays/registry.render.tsx`가 부른다. */
// 자족 렌더 위젯 — 행의 필드를 읽지 않는다.
export default function LayoutGridOverlayDisplay() {
	return <LayoutGridOverlayWidget />
}
