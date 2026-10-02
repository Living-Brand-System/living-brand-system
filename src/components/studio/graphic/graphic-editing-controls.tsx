'use client'

import {
	GRAPHIC_WIDGETS,
	GraphicWidgetConfigProvider,
} from '@/components/studio/graphic/graphic-widgets'
import { ControlPanel } from '@/components/studio/shared/control-panel'
import type { GraphicStudioConfig } from '@/features/graphic-generation/domain/graphic-studio-config'
import { toFlutedGlassInput } from '@/features/graphic-generation/graphic-runtimes/fluted-glass/model'
import { getGraphicStudioRuntimeGroups } from '@/features/graphic-generation/runtime/graphic-studio-runtime'
import {
	arrangeStudioPanel,
	type StudioPanelPolicy,
} from '@/modules/studio-controller/controller-composition'
import type { ControllerValues } from '@/modules/studio-controller/controller-definition'
import {
	type ControllerControlValue,
	type ControllerRuntimeBindings,
	controllerValuesEqual,
	createControllerValues,
} from '@/modules/studio-controller/controller-definition'

/**
 * 그래픽 패널의 배치 정책 — 역할을 자리에 놓는다(docs/10 §3.7). 매니페스트는 이것을 모른다.
 * Basic은 색 → 형태 → 놓임 → 재료 순(Figma 345:17104·529:23010), 세부 축은 Adjustment.
 */
export const GRAPHIC_PANEL_POLICY: StudioPanelPolicy = {
	basicPresets: ['preset'],
	basic: ['palette', 'form', 'placement', 'source'],
	adjustment: ['tuning'],
}

/** 컴포지션을 선언하지 않은 런타임은 전부 Basic에 선다 — 정하지 않은 런타임의 화면이 비면 안 된다. */
const UNDECLARED_PANEL_POLICY: StudioPanelPolicy = { basic: ['content'] }

/** 배경 그래픽도 독립 Graphic과 같은 컨트롤을 쓴다. 상태는 Template이 소유한다. */
export function GraphicEditingControls({
	config,
	storedValues,
	bindings,
	onChange,
}: {
	config: GraphicStudioConfig
	storedValues: ControllerValues
	bindings: ControllerRuntimeBindings
	onChange: (id: string, value: ControllerControlValue) => void
}) {
	const defaults = createControllerValues(config.controller.groups)
	const hasPreset = 'preset' in defaults
	const values = hasPreset
		? storedValues
		: {
				...storedValues,
				preset: Object.entries(defaults).every(([id, value]) =>
					controllerValuesEqual(storedValues[id], value),
				)
					? 'default'
					: 'custom',
			}
	// ponytail: Fluted Glass의 기준점은 만지기 전까지 모양이 정한 값이 실효값이라 판이 그 값을 보여 준다.
	//    실효값을 따로 갖는 런타임이 늘면 플러그인에 표시값 투영을 선언한다.
	const shown =
		config.id === 'fluted-glass'
			? { ...values, source: toFlutedGlassInput(values).input.source }
			: values
	// ponytail: 굵기 변화를 끄면 최대 굵기는 쓰이지 않는다 — 패턴 하나라 id를 직접 쓴다. 실행 제한(잠금)이 아니라
	//    화면 binding인 이유는 잠긴 값은 기본값과 같아야 내보내기가 열리기 때문이다.
	const panelBindings =
		config.id === 'key-visual-pattern' && values.variableWeight === false
			? {
					...bindings,
					maxWeight: { ...bindings.maxWeight, availability: 'disabled' as const },
				}
			: bindings
	const groups = getGraphicStudioRuntimeGroups(config, values)
	const { roles, clusters } = config.controller
	const declared = roles !== undefined || clusters !== undefined
	return (
		<GraphicWidgetConfigProvider value={config}>
			<ControlPanel
				composition={{
					slots: declared
						? arrangeStudioPanel(
								{ groups, clusters, roles },
								GRAPHIC_PANEL_POLICY,
								shown,
							)
						: arrangeStudioPanel(
								{
									groups: groups.map((group) => ({
										...group,
										role: 'content' as const,
									})),
								},
								UNDECLARED_PANEL_POLICY,
								shown,
							),
					values: shown,
					bindings: panelBindings,
					widgets: GRAPHIC_WIDGETS,
					onChange: (id, next) => {
						if (!hasPreset && id === 'preset') {
							if (next === 'default')
								for (const [controlId, value] of Object.entries(defaults))
									onChange(controlId, value)
							return
						}
						onChange(id, next)
					},
				}}
			/>
		</GraphicWidgetConfigProvider>
	)
}
