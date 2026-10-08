'use client'

import type {
	ControllerWidgetProps,
	ControllerWidgetRegistry,
} from '@/components/studio/panel/studio-panel-slot'
import { ColorPairWidget } from '@/components/studio/shared/widgets/color-pair'
import { ColorwayWidget } from '@/components/studio/shared/widgets/colorway'
import { CompoundWidget } from '@/components/studio/shared/widgets/compound'
import { PositionWidget } from '@/components/studio/shared/widgets/position'
import { PresetListWidget } from '@/components/studio/shared/widgets/preset-list'
import type { GraphicStudioConfig } from '@/features/graphic-generation/domain/graphic-studio-config'
import { playgroundGraphicColors } from '@/features/graphic-generation/domain/playground-graphics'
import { getGraphicStudioRuntimeGroups } from '@/features/graphic-generation/runtime/graphic-studio-runtime'

/**
 * 그래픽 묶음 위젯 레지스트리(docs/10 §3.7) — 매니페스트가 적은 위젯 종류를 그래픽 표면으로 그린다.
 * 🔑 위젯은 모듈 수준 컴포넌트다 — 렌더마다 새로 만들면 React가 매번 새 종류로 보고 다시 마운트한다.
 *    런타임에 따라 달라지는 것(선택지 조합·색 펼침)은 컴포지션이 싣는 `scope`(그래픽 config)로 푼다.
 */
export type GraphicWidgetScope = { config: GraphicStudioConfig }

function graphicConfig(scope: unknown): GraphicStudioConfig {
	const config = (scope as GraphicWidgetScope | undefined)?.config
	if (!config) throw new Error('그래픽 위젯은 그래픽 컴포지션(scope.config) 안에서만 그린다.')
	return config
}

/** 그래픽 런타임이 아는 것(전경 펼침·면에 따른 선의 범위)만 공용 color-pair에 넘긴다. */
function GraphicColorPairWidget(props: ControllerWidgetProps) {
	const config = graphicConfig(props.scope)
	return (
		<ColorPairWidget
			{...props}
			identity={config.id}
			spread={(foreground, background) =>
				playgroundGraphicColors(
					config.id as Parameters<typeof playgroundGraphicColors>[0],
					foreground,
					background,
				)
			}
			resolveControls={(values) =>
				getGraphicStudioRuntimeGroups(config, values).flatMap((group) => group.controls)
			}
		/>
	)
}

export const GRAPHIC_WIDGETS: ControllerWidgetRegistry = {
	'color-pair': GraphicColorPairWidget,
	colorway: ColorwayWidget,
	position: PositionWidget,
	compound: CompoundWidget,
	'preset-list': PresetListWidget,
}
