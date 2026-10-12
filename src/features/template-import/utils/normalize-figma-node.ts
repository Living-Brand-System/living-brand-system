import {
	isTemplateVectorNodeType,
	TEMPLATE_BACKGROUND_FIGMA_TYPE,
} from '@/features/template-core/domain/template-node-types'
import type { FigmaRenderedAsset, FigmaSourceNode, IrNode } from './figma-ir'
import {
	createBoxStyle,
	createChildPlacementStyle,
	createContainerStyle,
	createTextStyle,
	findCssLowerableImageFill,
	lowerNodeBackground,
	resolveTextTruncation,
	roundCssNumber,
} from './lower-figma-visuals'

/**
 * 정규화(normalize): Figma 소스 트리 → IR 트리, 그리고 그 판단의 사전 단계인 에셋 계획.
 *
 * 파이프라인에서 "판단"을 소유하는 단계다 — 어떤 노드가 CSS로 못 그려져 렌더 에셋이 필요한지(plan),
 * 태그 선택(div/p/img), 비가시 노드 제거, 스타일 병합 순서, 렌더 에셋 치환을 여기서 전부 끝낸다.
 * emit은 결과 IR을 문자열화만 하고, 에셋 해석 I/O는 서비스가 소유한다.
 */

// 에셋 계획 — 노드별 "CSS로 표현 가능한가" 판정

const KNOWN_HTML_NODE_TYPES = new Set([
	'DOCUMENT',
	'CANVAS',
	'FRAME',
	'GROUP',
	'SECTION',
	'COMPONENT',
	'COMPONENT_SET',
	'INSTANCE',
	'RECTANGLE',
	'TEXT',
	'TRANSFORM_GROUP',
	// SLICE는 이번 범위에서 기존 동작을 유지한다.
	'SLICE',
])
/** CSS 배경으로 표현할 수 없는 paint — fill에서는 IMAGE가 빠진다(단일 IMAGE fill은 background-image로 lowering). */
const RASTER_FILL_PAINT_TYPES = new Set(['PATTERN', 'VIDEO', 'GRADIENT_ANGULAR'])
const RASTER_STROKE_PAINT_TYPES = new Set(['IMAGE', 'PATTERN', 'VIDEO', 'GRADIENT_ANGULAR'])
const CSS_EFFECT_TYPES = new Set(['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR'])
const CSS_BLEND_MODES = new Set([
	'NORMAL',
	'PASS_THROUGH',
	'MULTIPLY',
	'SCREEN',
	'OVERLAY',
	'DARKEN',
	'LIGHTEN',
	'COLOR_DODGE',
	'COLOR_BURN',
	'HARD_LIGHT',
	'SOFT_LIGHT',
	'DIFFERENCE',
	'EXCLUSION',
	'HUE',
	'SATURATION',
	'COLOR',
	'LUMINOSITY',
])

/** 가시성 판정의 단일 소유자 — plan(에셋 수집)과 normalize(IR 생성)가 같은 서브트리를 제외해야 한다. */
const isRenderable = (node: FigmaSourceNode) => node.visible !== false && node.opacity !== 0

/** PNG 폴백으로 서브트리가 이미지에 구워진 레이어의 진단 — 어드민이 Figma 쪽 수정 지점을 찾는 데 쓴다. */
export interface FigmaRasterDiagnostic {
	nodeId: string
	name: string
	reason: string
	/** 함께 구워져 편집 불가가 된 하위 텍스트 레이어 수. */
	textLayerCount: number
}

/** 말줄임(…) 의도가 있는데 줄 수를 유도하지 못해 잘림(clip)만 적용된 텍스트 레이어의 진단. */
export interface FigmaTruncationDiagnostic {
	nodeId: string
	name: string
}

/** Figma 렌더 API로 구워야 하는 노드(서브트리째 이미지가 된다)와 별도 해석이 필요한 IMAGE fill 목록. */
export interface FigmaAssetPlan {
	renders: { nodeId: string; name: string; format: 'png' | 'svg' }[]
	imageFills: { imageRef: string; name: string }[]
	diagnostics: FigmaRasterDiagnostic[]
	truncationDiagnostics: FigmaTruncationDiagnostic[]
}

/** 트리를 훑어 에셋 계획을 만든다. 순수 함수 — 실제 렌더/다운로드 I/O는 서비스가 수행한다. */
export function planFigmaAssets(node: FigmaSourceNode): FigmaAssetPlan {
	const plan: FigmaAssetPlan = {
		renders: [],
		imageFills: [],
		diagnostics: [],
		truncationDiagnostics: [],
	}
	const seenImageRefs = new Set<string>()
	collectAssetRequests(node, plan, seenImageRefs)
	return plan
}

/**
 * 노드 하나의 에셋 필요를 판정한다.
 * 래스터 폴백 노드는 그 노드만 계획에 넣고 자식으로 내려가지 않는다(자식 픽셀이 렌더에 포함) —
 * 이때 왜 구워졌고 무엇을 삼켰는지 진단을 남긴다.
 * CSS로 그릴 수 있는 노드는 IMAGE fill의 imageRef만 수집하고 자식으로 재귀한다.
 */
function collectAssetRequests(
	node: FigmaSourceNode,
	plan: FigmaAssetPlan,
	seenImageRefs: Set<string>,
): void {
	if (!isRenderable(node)) return

	const rasterReason = findRasterFallbackReason(node)
	if (rasterReason) {
		plan.renders.push({ nodeId: node.id, name: node.name ?? node.id, format: 'png' })
		plan.diagnostics.push({
			nodeId: node.id,
			name: node.name ?? node.id,
			reason: rasterReason,
			textLayerCount: countVisibleTextLayers(node),
		})
		return
	}
	if (isTemplateVectorNodeType(node.type)) {
		plan.renders.push({ nodeId: node.id, name: node.name ?? node.id, format: 'svg' })
		return
	}

	// 말줄임 의도가 clip으로 강등되는 텍스트 — 판단은 resolveTextTruncation(단일 소유자)이 한다.
	if (node.type === 'TEXT') {
		const { truncates, lineClamp } = resolveTextTruncation(node)
		if (truncates && lineClamp === undefined) {
			plan.truncationDiagnostics.push({ nodeId: node.id, name: node.name ?? node.id })
		}
	}

	const imageFill = findCssLowerableImageFill(node)
	if (imageFill?.imageRef && !seenImageRefs.has(imageFill.imageRef)) {
		seenImageRefs.add(imageFill.imageRef)
		plan.imageFills.push({ imageRef: imageFill.imageRef, name: node.name ?? node.id })
	}

	for (const child of node.children ?? []) {
		collectAssetRequests(child, plan, seenImageRefs)
	}
}

/** 로고 인식 후보 — 렌더해서 brand-logos와 비교할 레이어. */
export interface FigmaLogoCandidate {
	node: FigmaSourceNode
	/** 이 후보를 품은 바깥 후보들 — 바깥이 로고로 인식되면 안쪽은 비교하지 않는다. */
	ancestorIds: string[]
}

const hasVisiblePaint = (paints: FigmaSourceNode['fills']) =>
	(paints ?? []).some(
		(paint) => paint.visible !== false && (paint.opacity ?? 1) > 0 && (paint.color?.a ?? 1) > 0,
	)

/** 벡터만으로 이뤄진 레이어인가 — 단독 벡터(컴파운드 패스), 또는 칠·효과 없는 묶음 안에 벡터만 있는 것(패스 그룹). */
function isVectorOnly(node: FigmaSourceNode): boolean {
	if (isTemplateVectorNodeType(node.type)) return true
	const children = (node.children ?? []).filter(isRenderable)
	return (
		children.length > 0 &&
		!hasVisiblePaint(node.fills) &&
		!hasVisiblePaint(node.strokes) &&
		!node.effects?.some((effect) => effect.visible !== false) &&
		children.every(isVectorOnly)
	)
}

/**
 * 로고 인식 후보를 바깥부터 모은다. 순수 함수 — 렌더·비교 I/O는 서비스가 한다.
 * 벡터만으로 된 레이어 중 박스 비율이 등록 로고 비율 하나와 가까운 것만 넣는다(렌더 요청 수를 줄인다).
 * 바깥 묶음이 로고가 아닐 때(로고 + 장식 선) 안쪽을 다시 보도록 안쪽 후보도 함께 넣는다.
 */
export function findFigmaLogoCandidates(
	root: FigmaSourceNode,
	isLogoAspect: (aspect: number) => boolean,
): FigmaLogoCandidate[] {
	const candidates: FigmaLogoCandidate[] = []
	const walk = (node: FigmaSourceNode, ancestorIds: string[]) => {
		if (!isRenderable(node)) return
		let inner = ancestorIds
		const box = node.absoluteBoundingBox
		if (
			node !== root &&
			box &&
			box.width > 0 &&
			box.height > 0 &&
			isVectorOnly(node) &&
			isLogoAspect(box.width / box.height)
		) {
			candidates.push({ node, ancestorIds })
			inner = [...ancestorIds, node.id]
		}
		for (const child of node.children ?? []) walk(child, inner)
	}
	walk(root, [])
	return candidates
}

/** 서브트리의 노드 id 전부(자기 포함). */
export function collectFigmaSubtreeIds(
	node: FigmaSourceNode,
	ids = new Set<string>(),
): Set<string> {
	ids.add(node.id)
	for (const child of node.children ?? []) collectFigmaSubtreeIds(child, ids)
	return ids
}

/** 서브트리에서 보이는 TEXT 레이어 수 — 래스터 폴백이 삼키는 편집 가능성의 크기를 진단에 싣는다. */
function countVisibleTextLayers(node: FigmaSourceNode): number {
	if (node.visible === false) return 0
	const own = node.type === 'TEXT' ? 1 : 0
	return (node.children ?? []).reduce((sum, child) => sum + countVisibleTextLayers(child), own)
}

/**
 * CSS로 충실히 표현할 수 없어 Figma 렌더(PNG)로 폴백해야 하는 이유를 돌려준다(없으면 undefined).
 * 단일 IMAGE fill은 background-image lowering이 담당하므로 여기서 걸리지 않는다 —
 * IMAGE가 있는데 lowering 불가(TEXT/다중 fill/imageRef 없음)인 조합만 래스터로 남는다.
 */
function findRasterFallbackReason(node: FigmaSourceNode): string | undefined {
	if (
		node.type === 'TEXT_PATH' ||
		(!KNOWN_HTML_NODE_TYPES.has(node.type) &&
			!isTemplateVectorNodeType(node.type) &&
			!node.children?.length)
	) {
		return '지원하지 않는 노드 타입'
	}
	if (node.isMask || node.children?.some((child) => child.isMask)) return '마스크 합성'

	const fills = (node.fills ?? []).filter((paint) => paint.visible !== false)
	const strokes = (node.strokes ?? []).filter((paint) => paint.visible !== false)
	if (strokes.length > 1 || strokes.some((paint) => RASTER_STROKE_PAINT_TYPES.has(paint.type))) {
		return '표현할 수 없는 테두리'
	}
	if (fills.some((paint) => RASTER_FILL_PAINT_TYPES.has(paint.type))) {
		return '지원하지 않는 fill 종류'
	}
	if (fills.some((paint) => paint.type === 'IMAGE') && !findCssLowerableImageFill(node)) {
		return node.type === 'TEXT' ? '텍스트 IMAGE fill' : '다른 fill과 겹친 IMAGE fill'
	}

	if (
		node.effects?.some(
			(effect) => effect.visible !== false && !CSS_EFFECT_TYPES.has(effect.type),
		)
	) {
		return '지원하지 않는 효과'
	}
	if (node.blendMode && !CSS_BLEND_MODES.has(node.blendMode)) return '지원하지 않는 블렌드 모드'

	if (!isTemplateVectorNodeType(node.type) && hasCssInexpressibleTransform(node)) {
		return '스케일·기울임 변형'
	}
	return undefined
}

/**
 * CSS로 옮길 수 없는 변형(스케일·기울임)인지 판정한다.
 * 순수 회전(항등 포함)은 rotate lowering이 표현하므로 래스터로 보내지 않는다 —
 * 회전 행렬은 a=d, b=-c, a²+b²=1을 만족하고, 그 밖의 행렬만 CSS 근사가 깨진다.
 */
function hasCssInexpressibleTransform(node: FigmaSourceNode): boolean {
	const transform = node.relativeTransform
	if (!transform) return false

	const [[a, b], [c, d]] = transform
	const epsilon = 0.000001
	const pureRotation =
		Math.abs(a - d) < epsilon &&
		Math.abs(b + c) < epsilon &&
		Math.abs(a * a + b * b - 1) < epsilon
	return !pureRotation
}

// IR 정규화

/** 루트 진입점: 소스 트리를 IR 트리로 정규화한다. 루트가 비가시면 null. */
export function normalizeFigmaNode(
	node: FigmaSourceNode,
	renderedAssets: Readonly<Record<string, FigmaRenderedAsset>> = {},
	imageFillAssets: Readonly<Record<string, FigmaRenderedAsset>> = {},
	backdropAsset?: FigmaRenderedAsset,
): IrNode | null {
	const root = normalizeNode(node, null, true, renderedAssets, imageFillAssets)
	return root && withBackgroundLayer(root, node, backdropAsset)
}

/** lowerNodeBackground가 내는 배경 선언 전부 — 판에서 bg 레이어로 옮기는 단위다. */
const BACKGROUND_KEYS = [
	'background',
	'background-color',
	'background-image',
	'background-size',
	'background-position',
	'background-repeat',
] as const

/**
 * 판 자신의 fill을 맨 뒤의 bg 레이어 하나로 세운다 — 스튜디오 「Background」가 이 레이어에 칠한다.
 * fill이 여러 겹이면 한 레이어 안에서 겹친 그대로 합친다. 이미지 레이어는 크기와 상관없이 이미지 레이어로 둔다.
 */
function withBackgroundLayer(
	root: IrNode,
	source: FigmaSourceNode,
	backdrop?: FigmaRenderedAsset,
): IrNode {
	if (!(source.fills ?? []).some((paint) => paint.visible !== false)) return root

	const style = { ...root.style }
	// 합성본이 있으면 판 fill(겹친 CSS)을 버리고 그 한 장을 판 크기로 깐다 — 이미 판 비율로 구운 그림이다.
	const background = backdrop
		? {
				'background-image': `url(${backdrop.url})`,
				'background-size': '100% 100%',
				'background-repeat': 'no-repeat',
			}
		: Object.fromEntries(
				BACKGROUND_KEYS.flatMap((key) => (style[key] ? [[key, style[key]]] : [])),
			)
	const fillAsset = backdrop ?? root.fillAsset
	for (const key of BACKGROUND_KEYS) delete style[key]
	return {
		...root,
		style,
		fillAsset: undefined,
		children: [
			{
				id: `${root.id}:bg`,
				name: 'bg',
				figmaType: TEMPLATE_BACKGROUND_FIGMA_TYPE,
				tag: 'div',
				style: {
					'box-sizing': 'border-box',
					position: 'absolute',
					left: '0',
					top: '0',
					width: '100%',
					height: '100%',
					...background,
				},
				fillAsset,
				// 이미지가 깔린 배경만 이미지 배정 자리다 — 단색 배경은 스튜디오 Background가 다룬다.
				...(fillAsset ? { imageCarrier: true as const } : {}),
				children: [],
			},
			...root.children,
		],
	}
}

/**
 * 노드 하나를 IrNode로 옮긴다. 스타일 병합 순서가 곧 우선순위다:
 * 컨테이너 레이아웃 → 박스 속성 → 텍스트/배경 → 자식 배치(마지막이 이긴다 — 절대배치 자식의
 * position:absolute가 컨테이너 기본 position:relative를 덮어쓰는 것이 의도).
 * 렌더 에셋이 있는 노드는 img 하나로 치환되고 자식은 그리지 않는다(에셋 픽셀에 이미 포함).
 */
function normalizeNode(
	node: FigmaSourceNode,
	parent: FigmaSourceNode | null,
	isRoot: boolean,
	renderedAssets: Readonly<Record<string, FigmaRenderedAsset>>,
	imageFillAssets: Readonly<Record<string, FigmaRenderedAsset>>,
): IrNode | null {
	if (!isRenderable(node)) return null

	const isText = node.type === 'TEXT'
	const renderedAsset = renderedAssets[node.id]
	const renderedBounds =
		renderedAsset && node.absoluteBoundingBox
			? {
					width: `${roundCssNumber(node.absoluteBoundingBox.width)}px`,
					height: `${roundCssNumber(node.absoluteBoundingBox.height)}px`,
				}
			: {}
	const background =
		renderedAsset || isText ? undefined : lowerNodeBackground(node, imageFillAssets)
	const box = renderedAsset ? {} : createBoxStyle(node)
	const placement = createChildPlacementStyle(node, parent, Boolean(renderedAsset))

	const style: IrNode['style'] = {
		'box-sizing': 'border-box',
		...(isRoot && node.absoluteBoundingBox
			? {
					width: `${roundCssNumber(node.absoluteBoundingBox.width)}px`,
					height: `${roundCssNumber(node.absoluteBoundingBox.height)}px`,
				}
			: {}),
		...(renderedAsset ? { display: 'block', ...renderedBounds } : createContainerStyle(node)),
		...box,
		// 컨테이너는 position:relative를 기본으로 둬 절대배치 자식의 기준 박스가 된다.
		// createChildPlacementStyle이 뒤에 병합되므로, 이 노드 자신이 절대배치면 position:absolute가 이겨 덮어쓴다.
		...(renderedAsset
			? {}
			: isText
				? createTextStyle(node)
				: { position: 'relative', ...background?.style }),
		...placement,
		// transform은 배치(translate 앵커)와 박스(rotate)가 각자 만들 수 있어 마지막에 합성한다 —
		// 스프레드 병합에 맡기면 한쪽이 다른 쪽을 undefined로 덮어쓴다.
		transform: [placement.transform, box.transform].filter(Boolean).join(' ') || undefined,
	}

	const children = renderedAsset
		? []
		: (node.children ?? [])
				.map((child) => normalizeNode(child, node, false, renderedAssets, imageFillAssets))
				.filter((child): child is IrNode => child !== null)

	// 이미지 캐리어 계약(임포트 시 1회 확정): 이미지 배정 가능한 표면은 임포트가 전부 여기서
	// 확정한다 — compose와 admin UI는 data-image-carrier 마킹만 보고, 마킹 없는 노드의 이미지
	// 배정은 무시된다.
	// 자기 마킹 두 경우:
	// ① 래스터 폴백 img(벡터 제외 — 벡터 img는 VectorLayerEditor 영역이라 절대 마킹하지 않는다)
	// ② 자식 없는 CSS-lowerable 이미지 fill 노드(스탠드얼론 이미지 사각형 등).
	//    자식 있는 이미지 fill 프레임은 배정 시 자식이 이미지를 가리므로 의도적으로 마킹하지 않는다.
	// 로고로 인식된 묶음은 등록 로고 SVG 하나가 된다 — 레이어 패널·VectorLayerEditor가 벡터로 다루도록 VECTOR로 적는다.
	const figmaType = renderedAsset?.collection === 'brand-logos' ? 'VECTOR' : node.type
	const selfCarrier = renderedAsset
		? !isTemplateVectorNodeType(figmaType)
		: children.length === 0 && Boolean(findCssLowerableImageFill(node))

	return {
		id: node.id,
		name: node.name ?? '',
		figmaType,
		tag: renderedAsset ? 'img' : isText ? 'p' : 'div',
		style,
		text: !renderedAsset && isText ? (node.characters ?? '') : undefined,
		imageCarrier: selfCarrier ? true : undefined,
		asset: renderedAsset,
		fillAsset: background?.fillAsset,
		children,
	}
}
