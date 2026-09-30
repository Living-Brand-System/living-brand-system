'use client'

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	GraphicStudioContext,
	type GraphicStudioValue,
} from '@/features/graphic-generation/contexts/graphic-studio-context'
import type { GraphicStudioConfig } from '@/features/graphic-generation/domain/graphic-studio-config'
import { getGraphicStudioRuntimeGroups } from '@/features/graphic-generation/runtime/graphic-studio-runtime'
import { fetchCanvasStudioConfigs } from '@/features/graphic-generation/services/list-canvas-studio-configs.client'
import { useLazyResource } from '@/hooks/use-lazy-resource'
import { getCanvasStudioRoute } from '@/lib/routes'
import {
	acceptsControllerDraftValue,
	type ControllerControlValue,
	type ControllerRuntimeBinding,
	type ControllerRuntimeBindings,
	controllerValuesEqual,
	createControllerValues,
	followsChangedDefault,
} from '@/modules/studio-controller/controller-definition'

/**
 * 가변 그래픽 편집 세션의 단일 소유자 — Controller와 P5·Shader 캔버스는 이 컨텍스트만
 * 알고 서로를 모른다. Definition은 기본값·제약을, Provider는 현재 값과 출력 액션을 소유한다.
 */
export function GraphicStudioProvider({
	config: initial,
	children,
}: {
	config: GraphicStudioConfig
	children: ReactNode
}) {
	/**
	 * 교체 후보 전체는 자산 브라우저가 열릴 때 가져온다 — 페이지는 시작 계약 하나만 싣는다.
	 * 🔴 어느 컬렉션을 보는지는 config가 이미 안다. 계약이 같다고 목록까지 같으면
	 *    Graph에서 Graphic 런타임이 나온다.
	 */
	const studio = initial.studio
	const browse = useLazyResource(useCallback(() => fetchCanvasStudioConfigs(studio), [studio]))
	const [config, setConfig] = useState(initial)
	const [values, setValues] = useState(() => createControllerValues(initial.controller.groups))
	/**
	 * 🔴 값 검증과 binding 등록은 **좁히기 전** 그룹을 본다. 좁힌 그룹은 값이 바뀔 때마다 새 배열이라,
	 *    여기에 매달면 `update`의 신원이 매번 바뀌고 그것을 의존성으로 삼는 캔버스가 컨트롤을
	 *    만질 때마다 destroy→mount 된다(2026-09-14에 실제로 캔버스가 깜빡였다).
	 *    좁힌 그룹은 **그리는 데만** 쓴다.
	 */
	const baseGroups = config.controller.groups
	const groups = useMemo(() => getGraphicStudioRuntimeGroups(config, values), [config, values])
	const [bindings, setBindings] = useState<ControllerRuntimeBindings>({})
	const bindingsRef = useRef<ControllerRuntimeBindings>({})
	/**
	 * 직전에 본 기본값. 🔑 기본값이 바뀌었다는 것은 **계약이 다른 것을 가리키게 됐다**는 뜻이고
	 * (표현을 바꾸면 그 표현의 데이터가 기본값이 된다), 그때 값이 따라가야 할지는 창작자가
	 * 그 값을 손댔는가로 갈린다. 옛 기본값 그대로면 손대지 않은 것이다.
	 */
	const defaultsRef = useRef<Record<string, ControllerControlValue>>({})
	const definitions = useMemo(
		() =>
			new Map(
				baseGroups.flatMap((group) =>
					group.controls.map((control) => [control.id, control] as const),
				),
			),
		[baseGroups],
	)

	/**
	 * 선택지가 좁아지면 들고 있던 값이 목록 밖에 남는다 — 화면은 그 값을 못 찾아 「—」를 그리고,
	 * 창작자는 무엇이 골라져 있는지 알 수 없다. 좁아진 계약의 기본값으로 끌어온다.
	 *
	 * 🔴 렌더 중에 고치지 않는다. 값을 바꾸면 groups가 다시 파생되는데, 그때는 이미 유효하므로
	 *    같은 객체가 돌아와 여기서 멈춘다(무한 루프가 아니다).
	 */
	useEffect(() => {
		const previousDefaults = defaultsRef.current
		defaultsRef.current = Object.fromEntries(
			groups.flatMap((group) =>
				group.controls.map((control) => [control.id, control.defaultValue] as const),
			),
		)
		setValues((current) => {
			let next = current
			for (const group of groups) {
				for (const control of group.controls) {
					if (!(control.id in current)) continue
					const value = current[control.id]
					/**
					 * 🔑 기본값이 바뀌었고 값이 **옛 기본값 그대로**면 손대지 않은 값이므로 새 기본값을
					 * 따라간다 — 표현을 바꾸면 그 표현의 데이터가 따라오는 자리가 여기다.
					 * 🔴 손댄 값은 지킨다. 덮으면 창작자가 적은 것이 되돌릴 방법 없이 사라진다.
					 */
					if (
						followsChangedDefault(
							value,
							previousDefaults[control.id],
							control.defaultValue,
						)
					) {
						if (next === current) next = { ...current }
						next[control.id] = control.defaultValue
						continue
					}
					if (
						value === undefined ||
						acceptsControllerDraftValue(control, value, bindingsRef.current[control.id])
					) {
						continue
					}
					/**
					 * 🔴 이미 기본값이면 손대지 않는다. 잠긴(`disabled`) control의 값은
					 * `acceptsControllerDraftValue`가 **언제나** 거부하므로, 여기서 매번 새 객체를
					 * 만들면 그것이 다시 이 effect를 깨워 무한 루프가 된다(실제로 화면이 죽었다).
					 */
					if (controllerValuesEqual(value, control.defaultValue)) continue
					if (next === current) next = { ...current }
					next[control.id] = control.defaultValue
				}
			}
			return next
		})
	}, [groups])

	const update = useCallback(
		(controlId: string, value: ControllerControlValue) => {
			const definition = definitions.get(controlId)
			if (
				!definition ||
				!acceptsControllerDraftValue(definition, value, bindingsRef.current[controlId])
			) {
				return false
			}
			setValues((current) => ({ ...current, [controlId]: value }))
			return true
		},
		[definitions],
	)

	const registerBindings = useCallback(
		(runtimeBindings: ControllerRuntimeBindings) => {
			const next: Record<string, ControllerRuntimeBinding> = {}
			for (const [controlId, binding] of Object.entries(runtimeBindings)) {
				if (definitions.has(controlId)) next[controlId] = binding
			}
			bindingsRef.current = next
			setBindings(next)
		},
		[definitions],
	)

	const selectProfile = useCallback(
		(nextProfileId: string) => {
			const next = browse.data?.find((item) => item.id === nextProfileId)
			if (!next || next.id === config.id) return
			bindingsRef.current = {}
			setBindings({})
			setValues(createControllerValues(next.controller.groups))
			setConfig(next)
			/**
			 * 새로고침해도 고른 프로파일이 남도록 주소를 맞춘다.
			 * 🔴 router로 옮기지 않는다 — 페이지가 다시 그려지면서 지금 세션이 통째로 사라진다.
			 *    이력도 쌓지 않는다(`replaceState`): 뒤로 가기가 화면은 안 바꾸고 주소만 되돌린다.
			 */
			window.history.replaceState(null, '', getCanvasStudioRoute(next.studio, next.id))
		},
		[browse.data, config.id],
	)
	const contextValue = useMemo<GraphicStudioValue>(
		() => ({
			profiles: { browse, select: selectProfile },
			config,
			groups,
			controls: { values, bindings, update, registerBindings },
		}),
		[bindings, browse, config, groups, registerBindings, selectProfile, update, values],
	)

	return (
		<GraphicStudioContext.Provider value={contextValue}>
			{children}
		</GraphicStudioContext.Provider>
	)
}
