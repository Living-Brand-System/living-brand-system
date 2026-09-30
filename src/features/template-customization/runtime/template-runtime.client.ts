'use client'

import { toCanvas } from 'html-to-image'
import { outlineVectorScene } from '@/features/studio-export/adapters/outline-vector-scene.client'
import type { AuthorizedTemplateAssetCollection } from '@/features/template-core/domain/template-asset-policy'
import { composeTemplateHtml } from '@/features/template-core/runtime/compose-template-html.client'
import type { TemplateAssignedImage } from '@/features/template-customization/contexts/template-studio-context'
import { resolveTemplateImageColorControls } from '@/features/template-customization/domain/image-colorize'
import {
	type ImageTransformValue,
	toImageEditTransform,
} from '@/features/template-customization/domain/image-edit-transform'
import type {
	ResolvedTemplateImageConfig,
	TemplateBackgroundType,
	TemplateImageConfigSlot,
	TemplateTextSlot,
	TemplateVectorSlot,
} from '@/features/template-customization/domain/template-studio-config'
import type {
	CanvasVideoSource,
	RasterArtifact,
	StudioArtifactProducer,
	VectorSceneArtifact,
	VideoArtifact,
} from '@/modules/studio-artifact/studio-artifact'
import type { ControllerValues } from '@/modules/studio-controller/controller-definition'
import type { TemplateNodeConfigMap } from '@/types/template'
import { withTemplateRasterStage } from './render-template-raster-stage.client'
import { templateDomToVectorScene } from './template-dom-to-vector-scene.client'

export type TemplateRasterArtifactSource = {
	height: number
	html: string
	width: number
}

export type TemplateRasterArtifact = RasterArtifact
export type TemplateRasterArtifactProducer = StudioArtifactProducer<TemplateRasterArtifact>

/** 현재 Template runtime 결과를 파일 형식과 무관한 Raster Artifact로 만든다. */
export function createTemplateRasterArtifact(
	source: TemplateRasterArtifactSource,
): TemplateRasterArtifact {
	return {
		kind: 'raster',
		source: {
			withSurface: (_options, consume) =>
				withTemplateRasterStage(source.html, (element) =>
					consume({
						kind: 'element',
						element,
						width: source.width,
						height: source.height,
					}),
				),
		},
	}
}

/**
 * 인쇄용 벡터 Artifact. Raster와 같은 stage를 쓰지만 굽지 않고 **재서** 도형으로 옮긴다.
 *
 * 🔴 벡터로 옮기지 못한 것을 조용히 버리지 않는다 — 그라디언트·그림자처럼 표현 못 하는 효과와,
 *    서체가 없어 윤곽선으로 못 바꾼 글줄을 진단으로 함께 돌려준다. 인쇄물은 되돌릴 수 없으므로
 *    무엇이 빠졌는지 사람이 알아야 한다.
 */
export type TemplateVectorArtifactResult = {
	artifact: VectorSceneArtifact
	diagnostics: {
		unsupported: readonly { nodeId: string; reason: string }[]
		notOutlined: readonly { text: string; fontFamily: string; reason: string }[]
	}
}

export async function createTemplateVectorArtifact({
	height,
	html,
	nodeLayers,
	width,
}: TemplateRasterArtifactSource & {
	/** nodeId → 묶음 이름(`mapTemplateNodeLayers`). 인쇄 PDF가 묶음을 그룹으로 싣는 데 쓴다. */
	nodeLayers: ReadonlyMap<string, string>
}): Promise<TemplateVectorArtifactResult> {
	const { scene, unsupported } = await withTemplateRasterStage(html, (element) =>
		templateDomToVectorScene(element, { width, height }, nodeLayers),
	)
	const outlined = await outlineVectorScene(scene)

	return {
		artifact: { kind: 'vector', source: outlined.scene },
		diagnostics: { notOutlined: outlined.notOutlined, unsupported },
	}
}

export type TemplateVideoArtifact = VideoArtifact<CanvasVideoSource>
/**
 * Raster와 달리 목표 프레임 크기를 인자로 받는다 — 전경 오버레이를 그 해상도로 한 번 구워야
 * 배율을 올려도 텍스트가 확대되지 않고 그 크기로 다시 래스터화된다.
 */
export type TemplateVideoArtifactProducer = (size: {
	width: number
	height: number
}) => Promise<TemplateVideoArtifact>

/**
 * 배경 Graphic만 시간에 따라 변하고 템플릿 레이어는 변하지 않는다 — 정지 레이어를 한 번만
 * rasterize하고 프레임마다 배경 shader만 다시 그려 2D canvas에 겹친다. 프레임마다 HTML을
 * 다시 rasterize하면 5초 영상 하나에 DOM 직렬화를 150번 하게 된다.
 * `html`은 캔버스 배경이 transparent로 비워진 합성 HTML이어야 한다 — 아니면 배경을 덮는다.
 * `width`·`height`는 캔버스 크기가 아니라 **내보낼 프레임 크기**다.
 */
export async function createTemplateVideoArtifact({
	background,
	height,
	html,
	width,
}: {
	background: CanvasVideoSource
	height: number
	html: string
	width: number
}): Promise<TemplateVideoArtifact> {
	const overlay = await withTemplateRasterStage(html, (element) =>
		toCanvas(element, { canvasHeight: height, canvasWidth: width, pixelRatio: 1 }),
	)
	const canvas = document.createElement('canvas')
	const context = canvas.getContext('2d')
	if (!context) throw new Error('MP4 합성용 2D 컨텍스트를 만들지 못했습니다.')
	return {
		kind: 'video',
		source: {
			canvas,
			renderFrame(timeSeconds, frameWidth, frameHeight) {
				// 인코더는 첫 프레임의 canvas 크기로 설정되므로 요청 해상도를 그대로 따른다.
				if (canvas.width !== frameWidth || canvas.height !== frameHeight) {
					canvas.width = frameWidth
					canvas.height = frameHeight
				}
				background.renderFrame(timeSeconds, frameWidth, frameHeight)
				context.clearRect(0, 0, frameWidth, frameHeight)
				context.drawImage(background.canvas, 0, 0, frameWidth, frameHeight)
				context.drawImage(overlay, 0, 0, frameWidth, frameHeight)
			},
			restore: () => background.restore(),
		},
	}
}

/**
 * Template runtime projector: 불변 published HTML과 현재 세션 IR을 합성 HTML로 투영한다.
 * 외부 I/O는 없고 실제 DOM 문자열 합성은 compose-template-html client adapter가 소유한다.
 */
export function composeTemplateStudioHtml({
	html,
	textSlots,
	textValues,
	textColor,
	imageStates,
	imageSlots,
	imageContracts,
	vectorSlots,
	vectorColors,
	layerVisibility,
	background,
	width,
	height,
}: {
	html: string
	textSlots: readonly TemplateTextSlot[]
	textValues: Readonly<Record<string, string>>
	textColor: string | null
	imageStates: Readonly<
		Record<
			string,
			{
				profileId?: number
				featureValues: ControllerValues
				image?: TemplateAssignedImage
				transform?: ImageTransformValue
			}
		>
	>
	imageSlots: readonly TemplateImageConfigSlot[]
	imageContracts: Readonly<Record<string, readonly ResolvedTemplateImageConfig[]>>
	vectorSlots: readonly TemplateVectorSlot[]
	vectorColors: Readonly<Record<string, string | undefined>>
	layerVisibility: Readonly<Record<string, boolean>>
	background: {
		type: TemplateBackgroundType
		color: string | null
		image?: { url: string }
		/** 배경 위 디머 — 배경 형식과 무관하게 적용한다(색 배경도 창작자가 더 누를 수 있다). */
		dimmer: boolean
		dimmerOpacity: number
	}
	width: number
	height: number
}): string {
	const textOverrides = Object.fromEntries(
		textSlots.flatMap((slot) => {
			const override: { text?: string; color?: string } = {}
			const text = textValues[slot.id]
			if (text !== undefined) override.text = text
			if (textColor) override.color = textColor
			return Object.keys(override).length > 0 ? [[slot.id, override] as const] : []
		}),
	)
	const imageOverrides = Object.fromEntries(
		Object.entries(imageStates).flatMap(([slotId, state]) => {
			const slot = imageSlots.find((candidate) => candidate.id === slotId)
			const contract = imageContracts[slotId]?.find(
				(candidate) => candidate.config.id === state.profileId,
			)
			const colorControls = contract
				? resolveTemplateImageColorControls(state, contract.config)
				: null
			const lineColor = colorControls ? state.featureValues[colorControls.line.id] : undefined
			const backgroundColor = colorControls?.background
				? state.featureValues[colorControls.background.id]
				: undefined
			const colorize =
				typeof lineColor === 'string'
					? {
							line: lineColor,
							...(typeof backgroundColor === 'string'
								? { background: backgroundColor }
								: {}),
						}
					: undefined
			const override = {
				...(colorize ? { imageColorize: colorize } : {}),
				...(state.image && state.transform
					? {
							imageTransform: toImageEditTransform(
								state.transform,
								slot?.box.width ?? width,
								slot?.box.height ?? height,
							),
						}
					: {}),
				...(state.image
					? {
							backgroundImage: state.image.url,
							assetRef: toTemplateAssetRef(state.image),
						}
					: {}),
			}
			return Object.keys(override).length ? [[slotId, override] as const] : []
		}),
	)
	const vectorOverrides = Object.fromEntries(
		vectorSlots.flatMap((slot) => {
			const vectorColor = vectorColors[slot.id]
			return vectorColor ? [[slot.id, { vectorColor }] as const] : []
		}),
	)
	const visibilityOverrides = Object.fromEntries(
		Object.entries(layerVisibility).map(([slotId, visible]) => [slotId, { visible }]),
	)
	const canvasBackground = {
		...(background.type === 'graphic' ? { clear: true } : {}),
		...(background.type === 'color' && background.color ? { color: background.color } : {}),
		...(background.type === 'image' && background.image
			? { imageUrl: background.image.url }
			: {}),
		// 꺼져 있으면 키를 빼서 조기 반환을 살린다 — 합성은 매번 불변 base HTML에서 다시 시작한다.
		...(background.dimmer && background.dimmerOpacity > 0
			? { dimmer: background.dimmerOpacity }
			: {}),
	}
	return composeTemplateHtml(
		html,
		mergeTemplateOverrides(textOverrides, imageOverrides, vectorOverrides, visibilityOverrides),
		{ canvasBackground },
	)
}

function mergeTemplateOverrides(...maps: readonly TemplateNodeConfigMap[]): TemplateNodeConfigMap {
	const merged: TemplateNodeConfigMap = {}
	for (const map of maps) {
		for (const [id, value] of Object.entries(map)) merged[id] = { ...merged[id], ...value }
	}
	return merged
}

/** 배정 이미지를 발행 검증이 읽는 자산 참조로 옮긴다 — 출처마다 컬렉션이 다르다. */
function toTemplateAssetRef(image: TemplateAssignedImage): {
	collection: AuthorizedTemplateAssetCollection
	id: number
} {
	return image.kind === 'generated'
		? { collection: 'generated-images', id: image.generatedImageId }
		: { collection: 'sample-images', id: image.sampleImageId }
}
