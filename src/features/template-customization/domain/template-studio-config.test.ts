import { describe, expect, it } from 'vitest'
import { resolveGraphicStudioOutput } from '@/features/graphic-generation/domain/graphic-studio-manifest'
import forwardStraightRuntimeManifest from '@/features/graphic-generation/graphic-runtimes/forward-straight/definition'
import {
	CAMERA_AZIMUTHS,
	CAMERA_ELEVATIONS,
} from '@/features/image-generation/domain/camera-control'
import type { ImageStudioConfig } from '@/features/image-generation/domain/image-studio-config'
import { createRasterExportRequest } from '@/features/studio-export/services/create-raster-export-request'
import { supportsStudioExportRequest } from '@/features/studio-export/studio-output'
import type { StudioRuntimeManifest } from '@/modules/studio-controller/controller-definition'
import {
	deriveTemplateStudioConfig,
	findTemplateControl,
	getTemplateRuntimeManifest,
	isBackgroundSlot,
	isImageSlot,
	isTextSlot,
	listCompatibleTemplateImageConfigs,
	type PublishedHtmlTemplate,
	parseTemplateStudioConfig,
	resolveTemplateImageConfig,
} from './template-studio-config'

const template: PublishedHtmlTemplate = {
	kind: 'html',
	id: 7,
	name: '포스터',
	html: [
		'<div>',
		'<p data-node-id="1:1" data-figma-type="TEXT" data-name="Title">기본 제목</p>',
		'<div data-node-id="2:1" data-figma-type="FRAME" data-name="Hero" data-image-carrier="" style="width:400px;height:300px"></div>',
		'</div>',
	].join(''),
	nodeConfigs: {
		'1:1': { input: { label: '제목', maxLength: 20, maxLines: 1 } },
		'2:1': { imageInput: { profileId: 3 }, imageColorize: { line: '#112233' } },
	},
	width: 800,
	height: 600,
	templateVersion: '2026-08-01T00:00:00.000Z',
}

const imageConfig = createImageConfig(3, ['1:1', '4:3'])
const forwardStraightConfig = {
	...forwardStraightRuntimeManifest,
	output: resolveGraphicStudioOutput(forwardStraightRuntimeManifest),
}

// 매니페스트에는 findTemplateControl(Config용)이 닿지 않으므로 그룹을 펼쳐 찾는다.
function findManifestControl(manifest: StudioRuntimeManifest, id: string) {
	return manifest.controller.groups
		.flatMap((group) => group.controls)
		.find((control) => control.id === id)
}

describe('deriveTemplateStudioConfig', () => {
	it('Runtime Manifest는 같은 Template 문서에서 같은 controller와 Artifact를 파생한다', () => {
		const manifest = getTemplateRuntimeManifest(template)

		expect(getTemplateRuntimeManifest(template)).toEqual(manifest)
		expect(manifest).toMatchObject({
			artifacts: { raster: {} },
			controller: {
				groups: [
					{ id: 'text', title: 'Text' },
					{ id: 'background', title: 'Background' },
				],
			},
		})
		expect(getTemplateRuntimeManifest({ ...template })).toEqual(manifest)
	})

	it('배경 정책이 형식을 좁히고 하나만 남으면 읽기 전용이 된다', () => {
		const manifest = getTemplateRuntimeManifest({
			...template,
			backgroundPolicy: { types: ['color'] },
		})

		expect(findManifestControl(manifest, 'background.type')).toMatchObject({
			availability: 'readonly',
			defaultValue: 'color',
			options: [{ value: 'color', label: 'Color' }],
		})
	})

	it('둘 이상 허용하면 읽기 전용이 아니고 기본값은 첫 허용 형식이다', () => {
		const manifest = getTemplateRuntimeManifest({
			...template,
			backgroundPolicy: { types: ['image', 'graphic'] },
		})
		const control = findManifestControl(manifest, 'background.type')

		expect(control).toMatchObject({
			defaultValue: 'image',
			options: [
				{ value: 'image', label: 'Image' },
				{ value: 'graphic', label: 'Graphic' },
			],
		})
		expect(
			control && 'availability' in control ? control.availability : undefined,
		).toBeUndefined()
	})

	it('색을 형식에서 막아도 background.color 컨트롤은 남는다', () => {
		const manifest = getTemplateRuntimeManifest({
			...template,
			backgroundPolicy: { types: ['image'] },
		})

		expect(findManifestControl(manifest, 'background.color')).toMatchObject({ kind: 'color' })
	})

	it('배경 정책이 디머를 끄면 디머 컨트롤 둘 다 매니페스트에서 빠진다', () => {
		const manifest = getTemplateRuntimeManifest({
			...template,
			backgroundPolicy: { dimmer: false },
		})

		expect(findManifestControl(manifest, 'background.dimmer')).toBeUndefined()
		expect(findManifestControl(manifest, 'background.dimmerOpacity')).toBeUndefined()
	})

	it('디머 미지정은 허용이다 — 기존 저장분과 다른 정책 키의 언어를 따른다', () => {
		const manifest = getTemplateRuntimeManifest({ ...template, backgroundPolicy: {} })

		expect(findManifestControl(manifest, 'background.dimmer')).toMatchObject({
			kind: 'toggle',
		})
		expect(findManifestControl(manifest, 'background.dimmerOpacity')).toMatchObject({
			kind: 'range',
		})
	})

	it('배경 형식을 전부 막으면 파생이 거부한다', () => {
		expect(() =>
			getTemplateRuntimeManifest({ ...template, backgroundPolicy: { types: [] } }),
		).toThrow('배경 형식')
	})

	it('정책이 없으면 지금까지의 매니페스트와 같다', () => {
		expect(getTemplateRuntimeManifest({ ...template, backgroundPolicy: {} })).toEqual(
			getTemplateRuntimeManifest(template),
		)
	})

	it('세로형 캔버스가 폴백의 가로형 1080p 상한에 막히지 않고 자기 크기로 MP4를 낸다', () => {
		// Poster 2X = 1260×1782. 폴백 상한(1920×1080)이 걸리면 높이 1782에서 내보내기가 죽는다.
		const poster = { ...template, width: 1260, height: 1782 }
		const config = deriveTemplateStudioConfig(poster, [imageConfig], [forwardStraightConfig])

		expect(config.output.formats).toContain('mp4')
		// 상한은 캔버스가 아니라 캔버스 × 허용 배율 — 1260×1782는 H.264 한도 안에서 2배까지 간다.
		expect(config.template.exportOption.maxScale).toBe(2)
		expect(config.output.video?.mp4).toMatchObject({ maxWidth: 2520, maxHeight: 3564 })

		const request = createRasterExportRequest('mp4', config.output, {
			width: poster.width,
			height: poster.height,
		})
		if (!request) throw new Error('MP4 요청을 만들지 못했습니다.')
		expect(supportsStudioExportRequest(config.output, request)).toBe(true)
	})

	it('Template 도메인 계약을 멱등 검증하고 slot의 알 수 없는 필드를 거부한다', () => {
		const config = deriveTemplateStudioConfig(template, [imageConfig], [forwardStraightConfig])
		expect(parseTemplateStudioConfig(parseTemplateStudioConfig(config))).toBe(config)
		expect(() =>
			parseTemplateStudioConfig({
				...config,
				template: {
					...config.template,
					slots: config.template.slots.map((slot, index) =>
						index === 0 ? { ...slot, unknown: true } : slot,
					),
				},
			}),
		).toThrow('알 수 없는')
		const imageSlot = config.template.slots.find(isImageSlot)
		expect(imageSlot).toBeDefined()
		if (!imageSlot) return
		expect(() =>
			parseTemplateStudioConfig({
				...config,
				template: {
					...config.template,
					slots: config.template.slots.map((slot) =>
						slot.id === imageSlot.id
							? {
									...slot,
									featureOverrides: {
										colorAdjustment: { line: '#112233', unknown: true },
									},
								}
							: slot,
					),
				},
			}),
		).toThrow('알 수 없는')
	})

	it('Effective output은 Template Artifact와 실제 Exporter capability를 벗어날 수 없다', () => {
		const config = deriveTemplateStudioConfig(template, [imageConfig], [forwardStraightConfig])
		// artifacts에 없는 형식을 output에 적으면 거부한다 — vector를 뺀 채 svg를 요구하는 꼴이다.
		const withoutVector = {
			...config,
			artifacts: { raster: {} },
			output: { ...config.output, formats: ['svg'] as const },
		}
		expect(() => parseTemplateStudioConfig(withoutVector)).toThrow(
			'지원하지 않는 output format',
		)
	})

	it('공통 envelope에는 전역 Definition, Template 확장에는 DOM·슬롯 binding을 둔다', () => {
		const config = deriveTemplateStudioConfig(template, [imageConfig], [forwardStraightConfig])

		expect(config).toMatchObject({ studio: 'template', id: 7, version: 1, name: '포스터' })
		const text = config.template.slots.filter(isTextSlot)
		expect(text).toHaveLength(1)
		expect(text[0]).toMatchObject({
			id: '1:1',
			label: '제목',
			controlId: 'text:1:1',
			input: { format: 'free', maxLines: 1 },
		})
		expect(config.controller.groups[0]?.controls[0]).toMatchObject({
			id: 'text:1:1',
			kind: 'text',
			defaultValue: '기본 제목',
			maxLength: 20,
		})

		const image = config.template.slots.filter(isImageSlot)
		expect(image).toHaveLength(1)
		expect(image[0]).toMatchObject({
			kind: 'image',
			box: { width: 400, height: 300 },
			imageConfig: { mode: 'pinned', configId: 3 },
			featureOverrides: { colorAdjustment: { line: '#112233' } },
			transform: { enabled: true },
		})
		expect(image[0]?.transform.limits.scale).toEqual({ min: 0.2, max: 5 })
		expect(config.template.imageConfigs).toEqual([imageConfig])
		expect(config.template.graphicConfigs).toEqual([forwardStraightConfig])
		expect(config.template.slots.filter(isBackgroundSlot)).toHaveLength(1)
		expect(config.template.textColorControlId).toBe('text.color')
		expect(findTemplateControl(config, 'background.color')).toMatchObject({
			kind: 'color',
			defaultValue: null,
		})
	})

	it('output은 Raster Exporter capability를 따르고 canvas만 Template 도메인 정보로 남긴다', () => {
		expect(deriveTemplateStudioConfig(template)).toMatchObject({
			// svg는 인쇄용 벡터 내보내기가 열었다 — Template artifacts가 vector를 선언한다.
			output: { formats: ['png', 'jpeg', 'tiff', 'pdf', 'svg', 'mp4'] },
			template: {
				exportOption: {
					canvas: { width: 800, height: 600 },
				},
			},
		})
		// 🔑 정책이 무엇을 적든 벡터(svg·pdf)는 남는다 — 판이 가진 성질이라 고르는 것이 아니다.
		expect(
			deriveTemplateStudioConfig({
				...template,
				exportPolicy: { allowedFormats: ['jpeg'] },
			}).output.formats,
		).toEqual(['jpeg', 'pdf', 'svg'])
		// 발행된 템플릿들이 실제로 갖고 있던 값 — 벡터만 더해지고 나머지는 그대로 좁혀진다.
		expect(
			deriveTemplateStudioConfig({
				...template,
				exportPolicy: { allowedFormats: ['png', 'jpeg', 'mp4'] },
			}).output.formats,
		).toEqual(['png', 'jpeg', 'pdf', 'svg', 'mp4'])
		// 래스터는 보장하지 않는다 — admin의 「래스터」 토글이 실제로 먹어야 한다.
		expect(
			deriveTemplateStudioConfig({
				...template,
				exportPolicy: { allowedFormats: ['mp4'] },
			}).output.formats,
		).not.toContain('png')
	})

	it('동적 published Template에서 만든 envelope도 공통 strict validator를 통과해야 한다', () => {
		expect(() =>
			deriveTemplateStudioConfig({
				...template,
				nodeConfigs: {
					...template.nodeConfigs,
					'1:1': { input: { label: '제목', maxLength: 2, maxLines: 1 } },
				},
			}),
		).toThrow('maxLength')
	})

	it('Controller 표현은 어드민 입력 없이 기본값으로 채워진다', () => {
		const config = deriveTemplateStudioConfig(template)

		expect(config.controllerPresentation?.groups).toEqual([
			{ groupId: 'text', collapsible: true, defaultOpen: true },
			{ groupId: 'background', collapsible: true, defaultOpen: true },
		])
	})

	it('배경 정책이 허용 이미지 프로파일을 배경 슬롯에 싣는다', () => {
		const config = deriveTemplateStudioConfig(
			{ ...template, backgroundPolicy: { imageConfigIds: [3] } },
			[imageConfig],
		)
		const background = config.template.slots.find(isBackgroundSlot)
		if (!background) throw new Error('배경 슬롯이 파생되지 않았다')

		expect(background.imageConfig).toEqual({ mode: 'selectable', allowedConfigIds: [3] })
		expect(listCompatibleTemplateImageConfigs(background, [imageConfig])).toHaveLength(1)
	})

	it('배경 정책이 그래픽 런타임 목록을 좁힌다', () => {
		const allowed = deriveTemplateStudioConfig(
			{ ...template, backgroundPolicy: { graphicConfigIds: [forwardStraightConfig.id] } },
			[],
			[forwardStraightConfig],
		)
		const blocked = deriveTemplateStudioConfig(
			{ ...template, backgroundPolicy: { graphicConfigIds: [] } },
			[],
			[forwardStraightConfig],
		)

		expect(allowed.template.graphicConfigs).toHaveLength(1)
		expect(blocked.template.graphicConfigs).toHaveLength(0)
	})

	it('이미지 레이어 정책이 허용 프로파일과 창작자 변형 허용을 슬롯에 싣는다', () => {
		const config = deriveTemplateStudioConfig(
			{
				...template,
				nodeConfigs: {
					...template.nodeConfigs,
					'2:1': {
						imageInput: { allowedProfileIds: [3], transform: { enabled: false } },
						imageColorize: { line: '#112233' },
					},
				},
			},
			[imageConfig],
		)
		const slot = config.template.slots.find(isImageSlot)

		expect(slot?.imageConfig).toEqual({ mode: 'selectable', allowedConfigIds: [3] })
		expect(slot?.transform.enabled).toBe(false)
	})

	it('변형 허용을 적지 않으면 지금까지처럼 허용이다', () => {
		const config = deriveTemplateStudioConfig(template, [imageConfig])

		expect(config.template.slots.find(isImageSlot)?.transform.enabled).toBe(true)
	})

	it('레이어 정책이 readonly면 텍스트 컨트롤도 readonly다', () => {
		const readonly = deriveTemplateStudioConfig({
			...template,
			nodeConfigs: {
				...template.nodeConfigs,
				'1:1': {
					input: { label: '제목', maxLength: 20, maxLines: 1 },
					creator: { access: 'readonly' },
				},
			},
		})
		expect(findTemplateControl(readonly, 'text:1:1')).toMatchObject({
			availability: 'readonly',
		})

		const editable = deriveTemplateStudioConfig(template)
		expect(findTemplateControl(editable, 'text:1:1')).not.toHaveProperty('availability')
	})
})

describe('resolveTemplateImageConfig', () => {
	it('nearest는 선택된 Config의 ratio options 안에서만 고르고 한 값 readonly로 좁힌다', () => {
		const resolved = resolveTemplateImageConfig(imageConfig, { width: 1600, height: 900 })

		expect(resolved?.ratio).toMatchObject({
			availability: 'readonly',
			defaultValue: '4:3',
			options: [{ value: '4:3', label: '4:3' }],
		})
		expect(resolved?.imageSize).toBe('2K')
	})

	it('batch 고정 계약은 options가 아니라 default가 1일 때만 Template 1장 생성과 호환된다', () => {
		const readonlyTwo = replaceSelectControl(imageConfig, 'batch', {
			availability: 'readonly',
			defaultValue: '2',
		})
		const readonlyOne = replaceSelectControl(readonlyTwo, 'batch', { defaultValue: '1' })

		expect(resolveTemplateImageConfig(readonlyTwo, { width: 400, height: 300 })).toBeNull()
		expect(resolveTemplateImageConfig(readonlyOne, { width: 400, height: 300 })).not.toBeNull()
	})

	it('ratio 고정 계약은 슬롯 nearest로 덮지 않고 Admin default 한 값만 사용한다', () => {
		const fixed = replaceSelectControl(createImageConfig(3, ['1:1', '16:9']), 'ratio', {
			availability: 'disabled',
			defaultValue: '1:1',
		})

		expect(
			resolveTemplateImageConfig(fixed, { width: 1600, height: 900 })?.ratio,
		).toMatchObject({
			availability: 'readonly',
			defaultValue: '1:1',
			options: [{ value: '1:1', label: '1:1' }],
		})
	})

	it('pinned Config가 없거나 Template 1장 생성을 지원하지 않으면 호환 목록에서 제외한다', () => {
		const config = deriveTemplateStudioConfig(template, [imageConfig])
		const slot = config.template.slots.find(isImageSlot)
		expect(slot).toBeDefined()
		if (!slot) return

		expect(listCompatibleTemplateImageConfigs(slot, [])).toEqual([])
		const incompatible = createImageConfig(3, ['4:3'], ['2', '4'])
		expect(listCompatibleTemplateImageConfigs(slot, [incompatible])).toEqual([])
	})

	it('selectable은 허용 목록과 Template 생성 제약을 모두 통과한 Config만 노출한다', () => {
		const config = deriveTemplateStudioConfig({
			...template,
			nodeConfigs: {
				...template.nodeConfigs,
				'2:1': { imageInput: {} },
			},
		})
		const source = config.template.slots.find(isImageSlot)
		expect(source).toBeDefined()
		if (!source) return
		const slot = {
			...source,
			imageConfig: { mode: 'selectable' as const, allowedConfigIds: [4] },
		}

		expect(
			listCompatibleTemplateImageConfigs(slot, [
				imageConfig,
				createImageConfig(4, ['4:3']),
			]).map(({ config: candidate }) => candidate.id),
		).toEqual([4])
	})
})

function createImageConfig(
	id: number,
	ratios: readonly string[],
	batch = ['1', '2', '4'],
): ImageStudioConfig {
	return {
		studio: 'image',
		artifacts: { raster: {}, original: {} },
		id,
		version: 1,
		name: `프로파일 ${id}`,
		output: { formats: ['png'], original: true },
		controller: {
			groups: [
				{
					id: 'image',
					title: 'Image',
					controls: [
						{
							id: 'prompt',
							kind: 'text',
							label: 'Prompt',
							defaultValue: '',
							multiline: true,
							maxLength: 250,
						},
					],
				},
				{
					id: 'profile-settings',
					title: 'Profile Settings',
					controls: [
						{
							id: 'lineColor',
							kind: 'color',
							label: 'Line Color',
							defaultValue: '#000000',
						},
					],
				},
				{
					id: 'generation-settings',
					title: 'Setting',
					controls: [
						{
							id: 'batch',
							kind: 'select',
							label: '장수',
							defaultValue: batch[0] ?? null,
							options: batch.map((value) => ({ value, label: value })),
						},
						{
							id: 'ratio',
							kind: 'select',
							label: '비율',
							defaultValue: ratios[0] ?? null,
							options: ratios.map((value) => ({ value, label: value })),
						},
						{
							id: 'resolution',
							kind: 'select',
							label: '해상도',
							defaultValue: '2K',
							options: [{ value: '2K', label: '2K' }],
						},
					],
				},
			],
		},
		image: {
			slug: `profile-${id}`,
			features: [
				{ type: 'color-adjustment', controls: { line: 'lineColor' } },
				{
					type: 'camera-control',
					azimuths: CAMERA_AZIMUTHS,
					elevations: CAMERA_ELEVATIONS,
				},
			],
		},
	}
}

function replaceSelectControl(
	config: ImageStudioConfig,
	id: string,
	patch: { availability?: 'enabled' | 'readonly' | 'disabled'; defaultValue?: string },
): ImageStudioConfig {
	return {
		...config,
		controller: {
			groups: config.controller.groups.map((group) => ({
				...group,
				controls: group.controls.map((control) =>
					control.id === id && control.kind === 'select'
						? { ...control, ...patch }
						: control,
				),
			})),
		},
	}
}
