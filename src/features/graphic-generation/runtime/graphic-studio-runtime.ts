import { graphStudioPlugins } from '@/features/graph-generation/graph-runtimes/catalog/model.generated'
import type { GraphicRuntimeManifest } from '@/features/graphic-generation/domain/graphic-studio-config'
import { graphicStudioPlugins } from '@/features/graphic-generation/graphic-runtimes/catalog/model.generated'
import {
	createGraphicStudioPluginCatalog,
	type GraphicStudioPlugin,
} from '@/features/graphic-generation/runtime/graphic-plugin'
import type { VectorSceneArtifact } from '@/modules/studio-artifact/studio-artifact'
import type {
	ControllerGroupDefinition,
	ControllerRuntimeBindings,
	ControllerValues,
	StudioControllerRestrictions,
} from '@/modules/studio-controller/controller-definition'
import {
	acceptsControllerExecutionValues,
	applyControllerRestrictions,
	createControllerValues,
} from '@/modules/studio-controller/controller-definition'

/**
 * 🔴 캔버스 스튜디오마다 **자기 카탈로그**를 본다. 하나로 합치면 Graph 화면에서 Graphic
 *    런타임이 열리고, 컬렉션을 가른 의미가 사라진다.
 */
const CANVAS_PLUGIN_CATALOGS = {
	graphic: createGraphicStudioPluginCatalog(graphicStudioPlugins),
	graph: createGraphicStudioPluginCatalog(graphStudioPlugins),
} as const

/** 등록된 Graphic model만 파일 형식과 무관한 Vector Artifact로 투영한다. */
export function getGraphicStudioVectorArtifact(
	config: GraphicRuntimeManifest,
	values: ControllerValues,
	viewport: { width: number; height: number },
): VectorSceneArtifact | null {
	const plugin = getGraphicStudioPlugin(config)
	if (
		!plugin?.createVectorArtifact ||
		!acceptsControllerExecutionValues(config.controller.groups, values)
	) {
		return null
	}
	return plugin.createVectorArtifact(values, viewport)
}

/** 파일 형식 정책과 무관하게 Vector Artifact producer 존재 여부만 반환한다. */
export function hasGraphicStudioVectorArtifact(config: GraphicRuntimeManifest): boolean {
	return Boolean(getGraphicStudioPlugin(config)?.createVectorArtifact)
}

/** Graphic plugin이 의미를 아는 control에만 대상 기하 binding을 제공한다. */
export function getGraphicStudioRuntimeBindings(
	config: GraphicRuntimeManifest,
	viewport: { width: number; height: number },
): ControllerRuntimeBindings {
	return getGraphicStudioPlugin(config)?.getBindings?.(viewport) ?? {}
}

/**
 * 현재 값이 좁히는 만큼만 줄인 control 그룹을 낸다 — 값에 따라 선택지가 달라지는 축이 쓰는 유일한 길.
 * 좁힐 것이 없으면 **같은 배열 참조**를 그대로 돌려준다(useMemo 아래에서 재렌더를 만들지 않게).
 */
export function getGraphicStudioRuntimeGroups(
	config: GraphicRuntimeManifest,
	values: ControllerValues,
): readonly ControllerGroupDefinition[] {
	const restrictions = getGraphicStudioPlugin(config)?.getRestrictions?.(values) ?? null
	if (!restrictions) return config.controller.groups
	return applyControllerRestrictions(
		config.controller.groups,
		clampRestrictionsToBase(config.controller.groups, restrictions),
	)
}

/** 프리셋 교체는 이전 편집값을 이어받지 않고 현재 계약의 기본값에서 시작한다. */
export function createGraphicPresetValues(
	config: GraphicRuntimeManifest,
	preset: ControllerValues[string],
): ControllerValues {
	return {
		...createControllerValues(
			getGraphicStudioRuntimeGroups(config, {
				...createControllerValues(config.controller.groups),
				preset,
			}),
		),
		preset,
	}
}

/**
 * 런타임이 낸 기본값을 **이미 좁혀진** 계약 안으로 끌어당긴다 — 프로파일이 좁힌 범위가 항상 이긴다.
 *
 * 🔴 이 자리가 없으면 창작자 화면이 통째로 죽는다. `config.controller.groups`에는 프로파일의
 *    `controllerRestrictions`가 이미 적용돼 있고, 그 위에 런타임 기본값이 범위 밖으로 얹히면
 *    `applyControllerRestrictions`가 던진다. 그 호출이 provider의 렌더 중이라 잡는 곳이 없다.
 *    manager는 admin 저장에서 아무 경고를 못 받으므로, 깨진 것을 보는 사람은 창작자뿐이다.
 * 🔴 프로파일이 **잠근** control은 런타임 기본값을 아예 받지 않는다. 받으면 창작자가 못 만지는
 *    값이 프리셋을 따라 움직이는데, 실행 경계는 잠긴 control에 「계약의 기본값과 같을 것」을
 *    요구하므로 미리보기는 멀쩡한 채 내보내기만 조용히 막힌다.
 * 🔴 select 계열(런타임이 선택지를 좁히면서 기본값도 주는 축)은 프로파일이 남긴 선택지와의 교집합만
 *    쓴다. 기본값이 그 밖이면 남은 첫 선택지로, 교집합이 비면 런타임 좁힘을 버리고 프로파일 선택지를
 *    그대로 둔다 — 범위와 같은 「프로파일이 이긴다」. 안 그러면 Formation 선 색·Pattern 방향처럼
 *    런타임이 스스로 좁히는 축을 admin이 또 좁히는 순간 스튜디오가 통째로 죽는다.
 */
function clampRestrictionsToBase(
	baseGroups: readonly ControllerGroupDefinition[],
	restrictions: StudioControllerRestrictions,
): StudioControllerRestrictions {
	const baseById = new Map(
		baseGroups.flatMap((group) =>
			group.controls.map((control) => [control.id, control] as const),
		),
	)
	return {
		controls: restrictions.controls.map((raw) => {
			const base = baseById.get(raw.controlId)
			const restriction = base?.kind === 'select' ? narrowSelectToBase(base, raw) : raw
			if (base && (base.availability ?? 'enabled') !== 'enabled') {
				const { defaultValue: _dropped, ...rest } = restriction
				return rest
			}
			if (base?.kind !== 'range' || typeof restriction.defaultValue !== 'number') {
				return restriction
			}
			const min = restriction.min ?? base.min
			const max = restriction.max ?? base.max
			const defaultValue = Math.min(Math.max(restriction.defaultValue, min), max)
			return defaultValue === restriction.defaultValue
				? restriction
				: { ...restriction, defaultValue }
		}),
	}
}

function narrowSelectToBase(
	base: Extract<ControllerGroupDefinition['controls'][number], { kind: 'select' }>,
	restriction: StudioControllerRestrictions['controls'][number],
): StudioControllerRestrictions['controls'][number] {
	if (!restriction.optionValues) return restriction
	const optionValues = restriction.optionValues.filter((value) =>
		base.options.some((option) => option.value === value),
	)
	if (optionValues.length === 0) {
		const { optionValues: _dropped, defaultValue: _default, ...rest } = restriction
		return rest
	}
	const { defaultValue } = restriction
	return {
		...restriction,
		optionValues,
		...(typeof defaultValue === 'string' && !optionValues.includes(defaultValue)
			? { defaultValue: optionValues[0] }
			: {}),
	}
}

function getGraphicStudioPlugin(config: GraphicRuntimeManifest): GraphicStudioPlugin | null {
	const catalog = CANVAS_PLUGIN_CATALOGS[config.studio]
	if (!catalog) return null
	const plugin = (catalog as Record<string, GraphicStudioPlugin | undefined>)[config.id]
	return plugin?.manifest.type === config.type ? plugin : null
}
