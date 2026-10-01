import { describe, expect, it } from 'vitest'
import type { GraphicStudioConfig } from '@/features/graphic-generation/domain/graphic-studio-config'
import { resolveGraphicStudioOutput } from '@/features/graphic-generation/domain/graphic-studio-manifest'
import manifest from '@/features/graphic-generation/graphic-runtimes/key-visual-pattern/definition'
import { getGraphicStudioRuntimeGroups } from '@/features/graphic-generation/runtime/graphic-studio-runtime'
import { createControllerValues } from '@/modules/studio-controller/controller-definition'
import type { TemplateBackgroundState } from '../contexts/template-studio-context'
import { updateBackgroundGraphic, updateTemplateBackground } from './template-studio-provider'

const STATE: TemplateBackgroundState = {
	type: 'color',
	imageMode: 'preset',
	color: null,
	prompt: '',
	generating: false,
	error: null,
	featureValues: {},
	graphicValues: {},
	dimmer: false,
	dimmerOpacity: 0.2,
}

describe('updateTemplateBackground', () => {
	// 실사고(2026-08-20): 리듀서가 dimmer 패치를 버려 스테이지에서 On이 눌리지 않았다.
	// TemplateBackgroundPatch의 키 전부가 상태에 반영되는지를 지킨다.
	it('patch의 모든 키를 상태에 반영한다', () => {
		const patched = updateTemplateBackground(
			STATE,
			{ imageMode: 'generate', dimmer: true, dimmerOpacity: 0.5 },
			[],
		)
		expect(patched).toMatchObject({ imageMode: 'generate', dimmer: true, dimmerOpacity: 0.5 })
	})

	it('패치에 없는 키는 그대로 둔다 — 디머를 꺼도 맞춰 둔 강도가 남는다', () => {
		const on = updateTemplateBackground(STATE, { dimmer: true, dimmerOpacity: 0.55 }, [])
		const off = updateTemplateBackground(on, { dimmer: false }, [])
		expect(off.dimmer).toBe(false)
		expect(off.dimmerOpacity).toBe(0.55)
	})
})

it('템플릿 그래픽 프리셋은 변경된 기본값을 따르고 읽기 전용 정책은 유지한다', () => {
	const config: GraphicStudioConfig = {
		...manifest,
		output: resolveGraphicStudioOutput(manifest),
	}
	const preset = config.controller.groups
		.flatMap((group) => group.controls)
		.find((control) => control.id === 'preset')
	if (preset?.kind !== 'select') throw new Error('프리셋 계약이 없습니다.')
	const current: TemplateBackgroundState = {
		...STATE,
		graphicConfigId: config.id,
		graphicValues: { ...createControllerValues(config.controller.groups), columnGap: 22 },
	}
	const nextPreset = preset.options.find(
		(option) => option.value !== current.graphicValues.preset,
	)?.value
	if (!nextPreset) throw new Error('다른 프리셋이 없습니다.')
	const next = updateBackgroundGraphic(current, 'preset', nextPreset, [config], {
		width: 800,
		height: 600,
	})
	const defaults = createControllerValues(
		getGraphicStudioRuntimeGroups(config, next.graphicValues),
	)
	expect(next.graphicValues.preset).toBe(nextPreset)
	expect(next.graphicValues.columnGap).toBe(defaults.columnGap)
	expect(next.graphicValues.rowGap).toBe(defaults.rowGap)
	const locked = {
		...config,
		controller: {
			...config.controller,
			groups: config.controller.groups.map((group) => ({
				...group,
				controls: group.controls.map((control) =>
					control.id === 'preset'
						? { ...control, availability: 'readonly' as const }
						: control,
				),
			})),
		},
	}
	expect(
		updateBackgroundGraphic(current, 'preset', nextPreset, [locked], {
			width: 800,
			height: 600,
		}),
	).toBe(current)
})
