import { describe, expect, it } from 'vitest'
import { getGraphicStudioVectorArtifact } from '@/features/graphic-generation/runtime/graphic-studio-runtime'
import { createControllerValues } from '@/modules/studio-controller/controller-definition'
import keyVisualPatternRuntimeManifest, {
	KEY_VISUAL_PATTERN_DEFAULT_INPUT,
} from './graphic-runtimes/key-visual-pattern/definition'
import {
	keyVisualPatternInputSchema,
	toKeyVisualPatternInput,
} from './graphic-runtimes/key-visual-pattern/model'

describe('keyVisualPatternRuntimeManifest', () => {
	it('P5 계약의 Controller 기본값을 런타임 입력으로 복원한다', () => {
		expect(keyVisualPatternRuntimeManifest.type).toBe('p5')
		expect(
			toKeyVisualPatternInput(
				createControllerValues(keyVisualPatternRuntimeManifest.controller.groups),
			),
		).toEqual(KEY_VISUAL_PATTERN_DEFAULT_INPUT)
	})

	it('런타임 입력의 범위와 알려지지 않은 필드를 거부한다', () => {
		expect(
			keyVisualPatternInputSchema.safeParse({
				...KEY_VISUAL_PATTERN_DEFAULT_INPUT,
				origin: { x: 1.1, y: 0.5 },
			}).success,
		).toBe(false)
		expect(
			keyVisualPatternInputSchema.safeParse({
				...KEY_VISUAL_PATTERN_DEFAULT_INPUT,
				extra: true,
			}).success,
		).toBe(false)
	})

	// 두 슬라이더가 서로를 모르므로 「얇은 쪽 > 두꺼운 쪽」을 만들 수 있다 — 만들어지면 램프가 뒤집힌다.
	it('가장 얇은 라인은 가장 두꺼운 라인을 넘지 못한다', () => {
		const values = createControllerValues(keyVisualPatternRuntimeManifest.controller.groups)
		expect(toKeyVisualPatternInput({ ...values, minWeight: 9, maxWeight: 6 })).toMatchObject({
			minWeight: 6,
			maxWeight: 6,
		})
		// 정상 순서는 그대로 통과한다.
		expect(toKeyVisualPatternInput({ ...values, minWeight: 3, maxWeight: 6 })).toMatchObject({
			minWeight: 3,
			maxWeight: 6,
		})
	})

	// 저장된 프로파일 값이 낡아 선택지에서 사라져도 화면은 떠야 한다.
	it('알 수 없는 선택지는 기본값으로 떨어진다', () => {
		const values = createControllerValues(keyVisualPatternRuntimeManifest.controller.groups)
		const input = toKeyVisualPatternInput({
			...values,
			direction: 'zigzag',
			colorway: 'sunset',
		})

		expect(input.direction).toBe(KEY_VISUAL_PATTERN_DEFAULT_INPUT.direction)
		expect(input.colorway).toBe(KEY_VISUAL_PATTERN_DEFAULT_INPUT.colorway)
	})

	it('Controller 기본값과 viewport를 pure Vector Artifact projector에 전달한다', () => {
		const values = createControllerValues(keyVisualPatternRuntimeManifest.controller.groups)
		const first = getGraphicStudioVectorArtifact(keyVisualPatternRuntimeManifest, values, {
			width: 100,
			height: 100,
		})
		const second = getGraphicStudioVectorArtifact(keyVisualPatternRuntimeManifest, values, {
			width: 100,
			height: 100,
		})
		expect(second).toEqual(first)
		expect(first).toMatchObject({ kind: 'vector', source: { width: 100, height: 100 } })
	})
})
