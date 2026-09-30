import { describe, expect, it } from 'vitest'
import {
	parseGraphicRuntimeManifest,
	parseGraphicStudioConfig,
} from '@/features/graphic-generation/domain/graphic-studio-config'
import {
	deriveGraphicStudioConfig,
	graphicRuntimeManifests,
	resolveGraphicStudioOutput,
} from '@/features/graphic-generation/domain/graphic-studio-manifest'
import flutedGlassRuntimeManifest from '@/features/graphic-generation/graphic-runtimes/fluted-glass/definition'
import forwardStraightRuntimeManifest from '@/features/graphic-generation/graphic-runtimes/forward-straight/definition'
import {
	type ControllerValues,
	createControllerValues,
} from '@/modules/studio-controller/controller-definition'
import { createGraphicStudioPluginCatalog } from './graphic-plugin'
import {
	getGraphicStudioRuntimeBindings,
	getGraphicStudioRuntimeGroups,
	getGraphicStudioVectorArtifact,
	hasGraphicStudioVectorArtifact,
} from './graphic-studio-runtime'

const config = forwardStraightRuntimeManifest

describe('graphicStudioRuntime', () => {
	it('Graphic 계약을 멱등하게 검증하고 잘못된 studio·type을 거부한다', () => {
		expect(parseGraphicRuntimeManifest(parseGraphicRuntimeManifest(config))).toBe(config)
		const effective = { ...config, output: resolveGraphicStudioOutput(config) }
		expect(effective.output.formats).toEqual(['png', 'jpeg', 'tiff', 'pdf', 'svg', 'mp4'])
		expect(resolveGraphicStudioOutput(flutedGlassRuntimeManifest).formats).toEqual([
			'png',
			'jpeg',
			'tiff',
			'pdf',
			'mp4',
		])
		expect(
			parseGraphicStudioConfig({
				...effective,
				output: { ...effective.output, formats: ['png'] },
			}).output.formats,
		).toEqual(['png'])
		const radial = {
			...flutedGlassRuntimeManifest,
			output: resolveGraphicStudioOutput(flutedGlassRuntimeManifest),
		}
		expect(() => parseGraphicStudioConfig({ ...radial, output: { formats: ['svg'] } })).toThrow(
			'지원하지 않는 output format',
		)
		expect(() => parseGraphicRuntimeManifest({ ...config, studio: 'image' })).toThrow('studio')
		expect(() => parseGraphicRuntimeManifest({ ...config, type: 'canvas' })).toThrow('type')
		expect(() => parseGraphicRuntimeManifest({ ...config, unknown: true })).toThrow(
			'알 수 없는',
		)
	})

	it('plugin catalog가 config·Vector Artifact projector·명시적 binding을 함께 제공한다', () => {
		expect(graphicRuntimeManifests).toContain(config)
		expect(config.artifacts).toEqual({ vector: {}, raster: {} })
		const values = createControllerValues(config.controller.groups)
		expect(
			getGraphicStudioVectorArtifact(config, values, { width: 800, height: 600 }),
		).toMatchObject({ kind: 'vector', source: { width: 800, height: 600 } })
		expect(getGraphicStudioRuntimeBindings(config, { width: 800, height: 600 })).toEqual({
			origin: { padAspectRatio: 4 / 3 },
		})
	})

	it('Shader runtime은 browser artifact만 등록하고 Vector 합성에서는 제외한다', () => {
		const shaderConfig = flutedGlassRuntimeManifest
		const values = createControllerValues(shaderConfig.controller.groups)

		expect(graphicRuntimeManifests).toContain(shaderConfig)
		expect(shaderConfig.artifacts).toEqual({
			raster: {},
			video: {
				fps: [24, 30, 60],
				maxDurationSeconds: 10,
				maxHeight: 1080,
				maxWidth: 1920,
			},
		})
		expect(
			getGraphicStudioVectorArtifact(shaderConfig, values, { width: 800, height: 600 }),
		).toBeNull()
		expect(hasGraphicStudioVectorArtifact(shaderConfig)).toBe(false)
		expect(hasGraphicStudioVectorArtifact(config)).toBe(true)
		expect(getGraphicStudioRuntimeBindings(shaderConfig, { width: 800, height: 600 })).toEqual({
			source: { padAspectRatio: 4 / 3 },
			glassOriginOffset: { padAspectRatio: 4 / 3 },
			glassDrift: { padAspectRatio: 4 / 3 },
		})
	})

	it('미등록 id와 type mismatch를 fail-closed한다', () => {
		const values = createControllerValues(config.controller.groups)
		for (const unsupported of [
			{ ...config, id: 'missing' },
			{ ...config, type: 'shader' as const },
		]) {
			expect(
				getGraphicStudioVectorArtifact(unsupported, values, { width: 800, height: 600 }),
			).toBeNull()
			expect(
				getGraphicStudioRuntimeBindings(unsupported, { width: 800, height: 600 }),
			).toEqual({})
		}
	})

	it('유효하지 않은 viewport에는 기하 binding을 만들지 않는다', () => {
		expect(getGraphicStudioRuntimeBindings(config, { width: 0, height: 600 })).toEqual({})
		expect(getGraphicStudioRuntimeBindings(config, { width: 800, height: 0 })).toEqual({})
	})

	it('선언한 왼쪽 축이 파생된 Config까지 실려 나간다', () => {
		const derived = deriveGraphicStudioConfig({
			id: 13,
			name: '왼쪽 축',
			runtime: 'forward-straight',
		})

		// 재조립하면서 빠뜨리면 오른쪽 컨트롤이 전부 왼쪽 패널로 몰린다.
		expect(derived.controller.left).toEqual(['lineColor', 'backgroundColor'])
	})

	it('🔴 모든 런타임이 좌·우 축을 선언한다 — 일부만 적용된 채로 머지되지 않게', () => {
		// 🔴 `right` 미선언은 계약상 「왼쪽이 아닌 전부가 오른쪽」이라, admin으로 내려야 할 축이
		//    조용히 오른쪽 패널에 되살아난다. left만 검사하면 그것을 못 잡는다.
		for (const side of ['left', 'right'] as const) {
			const missing = graphicRuntimeManifests.filter(
				(manifest) => manifest.controller[side] === undefined,
			)

			expect({ side, missing: missing.map((manifest) => manifest.id) }).toEqual({
				side,
				missing: [],
			})
		}
	})

	it('선언한 축은 실제로 그 런타임에 있는 control id다', () => {
		for (const manifest of graphicRuntimeManifests) {
			const ids = new Set(
				manifest.controller.groups.flatMap((group) =>
					group.controls.map((control) => control.id),
				),
			)
			for (const side of ['left', 'right'] as const) {
				const unknown = (manifest.controller[side] ?? []).filter((id) => !ids.has(id))

				expect({ runtime: manifest.id, side, unknown }).toEqual({
					runtime: manifest.id,
					side,
					unknown: [],
				})
			}
		}
	})

	it('published Graphic Profile은 Restrictions로 Runtime Manifest를 좁히고 미등록 runtime을 거부한다', () => {
		const profile = {
			id: 9,
			name: '고정 선 색',
			runtime: 'forward-straight',
			controllerRestrictions: {
				controls: [
					{
						controlId: 'lineColor',
						availability: 'readonly',
					},
				],
			},
		}
		const narrowed = deriveGraphicStudioConfig(profile)

		expect(narrowed).toMatchObject({ id: 'forward-straight', name: '고정 선 색' })
		expect(deriveGraphicStudioConfig(profile)).toEqual(narrowed)
		expect(forwardStraightRuntimeManifest.name).toBe('Forward Straight')
		expect(narrowed.controller.groups[0]).toMatchObject({
			title: 'Graphic',
		})
		expect(narrowed.controllerPresentation?.groups[0]).toEqual({
			groupId: 'graphic',
			collapsible: true,
			defaultOpen: true,
		})
		expect(narrowed.controller.groups[0]?.controls[0]).toMatchObject({
			id: 'lineColor',
			label: '선 색상',
			availability: 'readonly',
			defaultValue: '#ffffff',
		})
		expect(() =>
			deriveGraphicStudioConfig({ id: 10, name: 'Unknown', runtime: 'missing' }),
		).toThrow('등록되지 않은')
	})

	it('Vector Artifact capability는 output format 정책과 독립적이다', () => {
		const values = createControllerValues(config.controller.groups)
		expect(
			getGraphicStudioVectorArtifact(config, values, {
				width: 800,
				height: 600,
			}),
		).toMatchObject({ kind: 'vector' })
	})

	it('Catalog는 같은 stable ID의 Plugin을 중복 등록하지 않는다', () => {
		const plugin = {
			manifest: config,
		}
		expect(() => createGraphicStudioPluginCatalog([plugin, plugin])).toThrow(
			'중복된 Graphic plugin',
		)
	})
})

/**
 * 프로파일이 좁힌 계약 위에 런타임 기본값이 얹히는 자리. 🔴 클램프가 없으면 렌더 중에 던져
 * 창작자 화면이 통째로 죽는다 — manager는 admin 저장에서 아무 경고를 못 받으므로 아무도 못 잡는다.
 */
describe('런타임 기본값과 프로파일 좁힘이 부딪힐 때', () => {
	const runtime = 'key-visual-pattern'
	const maxWeightOf = (values: ControllerValues, narrowed: unknown) => {
		const config = deriveGraphicStudioConfig({
			id: 1,
			name: 'KVP',
			runtime,
			controllerRestrictions: narrowed,
		})
		const groups = getGraphicStudioRuntimeGroups(config, values)
		return groups
			.flatMap((group) => group.controls)
			.find((control) => control.id === 'maxWeight')?.defaultValue
	}

	it('좁힌 범위 밖 기본값을 던지지 않고 범위 안으로 끌어당긴다', () => {
		const narrowed = { controls: [{ controlId: 'maxWeight', max: 10 }] }

		// 프리셋이 원한 값은 14지만 프로파일이 10까지만 허용한다 — 프로파일이 이긴다.
		expect(maxWeightOf({ preset: 'cornerVanishing' }, narrowed)).toBe(10)
		// 범위 안쪽 값은 그대로 지나간다.
		expect(maxWeightOf({ preset: 'flatDiagonal' }, narrowed)).toBe(4)
	})

	// 기본 프리셋까지 범위 밖이면 창작자가 아무것도 누르지 않아도 첫 렌더에서 죽었다.
	it('기본 프리셋이 범위 밖이어도 첫 렌더가 살아 있다', () => {
		const narrowed = { controls: [{ controlId: 'maxWeight', max: 8, defaultValue: 8 }] }

		expect(() => maxWeightOf({}, narrowed)).not.toThrow()
		expect(maxWeightOf({}, narrowed)).toBe(8)
	})

	// 잠근 control이 프리셋을 따라 움직이면 실행 경계가 값을 거부해 내보내기만 조용히 막힌다.
	it('프로파일이 잠근 control은 프리셋을 따라가지 않고 내보내기가 살아 있다', () => {
		for (const availability of ['readonly', 'disabled'] as const) {
			const config = deriveGraphicStudioConfig({
				id: 1,
				name: 'KVP',
				runtime,
				controllerRestrictions: { controls: [{ controlId: 'origin', availability }] },
			})
			const locked = config.controller.groups
				.flatMap((group) => group.controls)
				.find((control) => control.id === 'origin')
			const afterPreset = getGraphicStudioRuntimeGroups(config, {
				preset: 'cornerVanishing',
			})
				.flatMap((group) => group.controls)
				.find((control) => control.id === 'origin')

			expect(afterPreset?.defaultValue, availability).toEqual(locked?.defaultValue)
			expect(
				getGraphicStudioVectorArtifact(
					config,
					{
						...createControllerValues(config.controller.groups),
						preset: 'cornerVanishing',
					},
					{ width: 800, height: 600 },
				),
				availability,
			).toMatchObject({ kind: 'vector' })
		}
	})

	it('좁히지 않은 프로파일에서는 프리셋 값이 그대로 선다', () => {
		expect(maxWeightOf({ preset: 'cornerVanishing' }, null)).toBe(14)
		expect(maxWeightOf({ preset: 'verticalDrift' }, null)).toBe(15)
	})
})
