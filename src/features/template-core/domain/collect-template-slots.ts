import { Parser } from 'htmlparser2'
import type {
	TemplateLayerAccess,
	TemplateNodeConfig,
	TemplateNodeConfigMap,
	TemplateSlotSpec,
} from '@/types/template'
import { isTemplateVectorNodeType } from './template-node-types'

/** 표시 여부는 정책이 아니다 — 스튜디오 사용자가 Layers 패널에서 정한다(2026-10-07). */
export type ResolvedTemplateLayerPolicy = {
	access: Exclude<TemplateLayerAccess, 'hidden'>
}

/** 명시 정책을 우선하고 기존 input/imageInput은 editable 선언으로 호환한다. */
export function resolveTemplateLayerPolicy(
	config: TemplateNodeConfig | undefined,
	legacyEditable: boolean,
): ResolvedTemplateLayerPolicy | null {
	const access = config?.creator?.access ?? (legacyEditable ? 'editable' : 'hidden')
	if (access === 'hidden') return null
	return { access }
}

export interface TemplateSlot {
	nodeId: string
	name: string
	text: string
	input: TemplateSlotSpec
	policy: ResolvedTemplateLayerPolicy
}

export interface TemplateImageSlot {
	nodeId: string
	name: string
	/** 제작자가 고정한 이미지 프로파일 — 없으면 유저가 스튜디오에서 선택한다. */
	profileId?: number
	/** 창작자가 고를 수 있는 프로파일 범위 — 없으면 접근 가능한 전부다. */
	allowedProfileIds?: readonly number[]
	/** 창작자의 이동·확대·회전 허용. */
	transformEnabled: boolean
	/** 슬롯 요소 자신의 inline width/height(px) — clipsContent 프레임의 가시 박스인 자신을 쓴다. */
	boxWidth?: number
	boxHeight?: number
	policy: ResolvedTemplateLayerPolicy
}

export interface TemplateVectorSlot {
	nodeId: string
	name: string
	color?: string
	policy: ResolvedTemplateLayerPolicy
}

// 서버(agent tool)와 브라우저 양쪽에서 돌도록 DOMParser 대신 htmlparser2로 읽는다.
// html은 compose(DOMParser→innerHTML 왕복) 산출물일 수 있어 속성값에 raw `>`가 남는다 —
// 정규식으로는 이 형태를 안전하게 못 읽는다.
const PARSER_OPTIONS = { decodeEntities: true, lowerCaseAttributeNames: true, lowerCaseTags: true }

// emit이 굳힌 inline style에서 px 치수만 읽는다 — min-width 등 접두 속성은 경계 문자로 걸러진다.
function readPxDimension(style: string | undefined, property: string): number | undefined {
	if (!style) return undefined
	const raw = new RegExp(`(?:^|[;\\s])${property}:\\s*(\\d*\\.?\\d+)px`).exec(style)?.[1]
	const parsed = raw ? Number(raw) : Number.NaN
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

/**
 * HTML 템플릿에서 열린 입력 슬롯(input이 달린 텍스트 노드)을 문서 순서로 모은다.
 * input은 텍스트 노드에만 유효 — 다른 노드나 base에 없는 노드의 input은
 * 고아 오버라이드처럼 조용히 무시한다.
 * 외부 I/O는 없으며 호출 Use Case가 조회·저장 경계를 소유한다.
 */
export function collectTemplateSlots(
	html: string,
	nodeConfigs: TemplateNodeConfigMap,
): TemplateSlot[] {
	if (!html) return []

	const slots: TemplateSlot[] = []
	// 컨버터 산출물의 텍스트 노드는 자식 요소 없는 <p>라 열림/닫힘 사이 텍스트만 모으면 된다.
	let current: TemplateSlot | null = null

	const parser = new Parser(
		{
			onclosetag(tagName) {
				if (tagName === 'p' && current) {
					slots.push(current)
					current = null
				}
			},
			onopentag(tagName, attributes) {
				if (tagName !== 'p') return
				const nodeId = attributes['data-node-id']
				const config = nodeId ? nodeConfigs[nodeId] : undefined
				const policy = resolveTemplateLayerPolicy(config, Boolean(config?.input))
				if (!nodeId || !config?.input || !policy) return
				current = {
					nodeId,
					name: attributes['data-name'] || nodeId,
					text: '',
					input: config.input,
					policy,
				}
			},
			ontext(text) {
				if (current) current.text += text
			},
		},
		PARSER_OPTIONS,
	)
	parser.end(html)

	return slots
}

/**
 * HTML 템플릿에서 스튜디오에 개방된 이미지 슬롯(imageInput이 달린 노드)을 문서 순서로 모은다.
 * imageInput은 텍스트 노드(<p>)에는 무효 — base에 없는 노드의 imageInput은 고아 오버라이드처럼 조용히 무시한다.
 * 외부 I/O는 없으며 호출 Use Case가 조회·저장 경계를 소유한다.
 */
export function collectTemplateImageSlots(
	html: string,
	nodeConfigs: TemplateNodeConfigMap,
): TemplateImageSlot[] {
	if (!html) return []

	const slots: TemplateImageSlot[] = []

	const parser = new Parser(
		{
			onopentag(tagName, attributes) {
				if (tagName === 'p') return
				const nodeId = attributes['data-node-id']
				const config = nodeId ? nodeConfigs[nodeId] : undefined
				const policy = resolveTemplateLayerPolicy(config, Boolean(config?.imageInput))
				if (!nodeId || !config?.imageInput || !policy) return

				const style = attributes.style
				slots.push({
					nodeId,
					name: attributes['data-name'] || nodeId,
					profileId: config.imageInput.profileId,
					...(config.imageInput.allowedProfileIds
						? { allowedProfileIds: config.imageInput.allowedProfileIds }
						: {}),
					transformEnabled: config.imageInput.transform?.enabled ?? true,
					boxWidth: readPxDimension(style, 'width'),
					boxHeight: readPxDimension(style, 'height'),
					policy,
				})
			},
		},
		PARSER_OPTIONS,
	)
	parser.end(html)

	return slots
}

/** 명시적으로 Creator에 노출한 벡터 레이어를 문서 순서로 모은다. */
export function collectTemplateVectorSlots(
	html: string,
	nodeConfigs: TemplateNodeConfigMap,
): TemplateVectorSlot[] {
	if (!html) return []
	const slots: TemplateVectorSlot[] = []
	const parser = new Parser(
		{
			onopentag(_tagName, attributes) {
				const nodeId = attributes['data-node-id']
				const config = nodeId ? nodeConfigs[nodeId] : undefined
				const policy = resolveTemplateLayerPolicy(config, false)
				if (
					!nodeId ||
					!policy ||
					!isTemplateVectorNodeType(attributes['data-figma-type'] ?? '')
				) {
					return
				}
				slots.push({
					nodeId,
					name: attributes['data-name'] || nodeId,
					color: config?.vectorColor,
					policy,
				})
			},
		},
		PARSER_OPTIONS,
	)
	parser.end(html)
	return slots
}
