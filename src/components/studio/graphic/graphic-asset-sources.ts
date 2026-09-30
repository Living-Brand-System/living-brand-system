import type { ControllerAssetSources } from '@/components/shared/controller-renderer'
import { SampleImageAssetSource } from '@/components/studio/graphic/sample-image-asset-source'

/**
 * Graphic 스튜디오가 `asset` control에 붙이는 출처 화면. 🔴 모듈 상수다 —
 * 렌더 본문에서 만들면 매 렌더마다 새 컴포넌트 신원이 되어 패널이 통째로 다시 마운트된다.
 */
export const GRAPHIC_ASSET_SOURCES: ControllerAssetSources = {
	'sample-images': SampleImageAssetSource,
}
