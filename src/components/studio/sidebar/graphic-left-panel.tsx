'use client'

import { ControllerRenderer } from '@/components/shared/controller-renderer'
import { GRAPHIC_ASSET_SOURCES } from '@/components/studio/graphic/graphic-asset-sources'
import { StudioLeftPanel } from '@/components/studio/sidebar/studio-left-panel'
import { useGraphicStudio } from '@/features/graphic-generation/hooks/use-graphic-studio'
import { splitControllerGroups } from '@/modules/studio-controller/controller-definition'

/**
 * 캔버스 왼쪽 패널 — 창작자가 실제로 다루는 큰 축만 앉는다(색 조합·형태).
 *
 * 오른쪽 패널(`GraphicSidebar`)과 같은 껍데기를 쓰고 header·footer를 두지 않는다 —
 * 아이덴티티 카드와 내보내기는 오른쪽이 소유한다. 어느 축이 여기 오는지는 런타임이
 * `controller.left`로 선언한다.
 */
export function GraphicLeftPanel() {
	const { config, groups, controls } = useGraphicStudio()
	const { left } = splitControllerGroups(groups, config.controller.left, config.controller.right)

	// 🔴 축이 없어도 `null`을 내지 않는다 — 레이아웃은 콘텐츠와 별개다. 빈 자리는 껍데기가 말한다.
	return (
		<StudioLeftPanel
			empty={{
				title: '이 프로파일에는 왼쪽 컨트롤이 없습니다',
				description: '운영자가 controller.left로 어느 축을 여기 세울지 정합니다.',
			}}
		>
			{left.length > 0 ? (
				<ControllerRenderer
					groups={left}
					presentation={config.controllerPresentation}
					values={controls.values}
					bindings={controls.bindings}
					assetSources={GRAPHIC_ASSET_SOURCES}
					onChange={controls.update}
				/>
			) : undefined}
		</StudioLeftPanel>
	)
}
