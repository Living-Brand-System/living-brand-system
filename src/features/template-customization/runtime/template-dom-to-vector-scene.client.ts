'use client'

import { toPng } from 'html-to-image'
import { TEMPLATE_BACKGROUND_LAYER } from '@/features/template-customization/domain/template-studio-config'
import type { VectorPrimitive, VectorScene } from '@/modules/studio-artifact/studio-artifact'
import { cropBakedImage, type ImageFit, toBakedImageDataUrl } from './image-to-data-url.client'
import { svgAssetToPrimitives, svgAssetUsesStyleSheetFill } from './svg-asset-to-primitives.client'

/**
 * 레이아웃이 끝난 export stage를 파일 형식과 무관한 Vector Scene으로 옮긴다.
 *
 * 🔑 stage는 `withTemplateRasterStage`가 만든 것을 그대로 받는다 — 태그가 `div`·`img`·`p` 3종으로
 *    제한되고 이미지·서체 로딩까지 끝난 상태다. 그래서 여기서는 **잰다**만 하고 안전성은 다시 보지 않는다.
 * 🔴 좌표는 브라우저 레이아웃에서만 나온다. Figma가 준 HTML은 좌표를 CSS에 갖고 있지만 텍스트 줄바꿈은
 *    렌더해 봐야 알 수 있어서, 노드 스타일을 읽는 방식으로는 줄 단위 위치를 못 만든다.
 *
 * 🔑 SVG 자산(로고·심볼)은 도형으로 펼친다. `img[src$=.svg]`든 CSS 마스크든 마찬가지다 —
 *    그대로 두면 인쇄물에서 로고만 벡터가 아니게 된다(`svg-asset-to-primitives`).
 * 🔑 **래스터 마스크는 그 노드만 구워 얹는다.** 생성 이미지를 휘도 마스크로 써서 색을 입히는
 *    컬러라이즈가 그 형태인데(`compose-template-html`의 `applyImageColorize`), 원리적으로 벡터가
 *    될 수 없다. 굽지 않으면 배경 이미지를 건너뛰고 배경색만 남아 **단색 사각형이 그림을 덮는다.**
 * 🔴 그 밖의 효과(그라디언트·그림자·블러·블렌드)는 **감지만 하고 굽지 않는다.** 2026-08-27 실측에서
 *    쓰는 템플릿이 0건이었다 — 안 쓰는 것을 위해 만들면 멀쩡한 것을 망가뜨린다(위장 그라디언트 사고).
 *    실제로 나타나면 `unsupported` 경고가 먼저 알려 준다.
 */
export type TemplateVectorSceneResult = {
	scene: VectorScene
	/** 벡터로 옮기지 못한 노드. `{nodeId, reason}`이며 래스터 폴백의 입력이다. */
	unsupported: readonly { nodeId: string; reason: string }[]
}

type Box = { x: number; y: number; width: number; height: number }

export async function templateDomToVectorScene(
	stage: HTMLElement,
	size: { width: number; height: number },
	/**
	 * nodeId → 묶음 이름(`mapTemplateNodeLayers`). 여기 없는 노드는 배경 묶음에 든다.
	 * 🔑 인쇄 PDF가 묶음 하나를 Form XObject 하나로 싣고 Illustrator가 그것을 그룹으로 연다.
	 */
	nodeLayers: ReadonlyMap<string, string> = new Map(),
): Promise<TemplateVectorSceneResult> {
	const origin = stage.getBoundingClientRect()
	const unsupported: { nodeId: string; reason: string }[] = []
	const context = { nodeLayers, origin, unsupported }
	const primitives = [
		...(await plateBackdrop(stage, context)),
		...(await walkAll(Array.from(stage.children), context, TEMPLATE_BACKGROUND_LAYER)),
	]

	// 🔴 stage에 배경이 없으면 **발명하지 않는다.** 템플릿의 판 바닥은 루트 프레임(=stage의 자식)이
	//    갖고 걷기가 이미 집으므로, 여기서 흰색을 만들면 판 전체 사각형이 **두 장**이 된다
	//    (2026-09-10 PDF 바이트 실측: 마크 밖에 동일 좌표 흰 사각형 2개).
	const plate = solidColor(getComputedStyle(stage).backgroundColor)

	return {
		scene: {
			width: size.width,
			height: size.height,
			...(plate ? { background: plate } : {}),
			primitives,
		},
		unsupported,
	}
}

/**
 * 판 자신의 배경을 다른 요소와 **같은 규칙으로** 옮긴다.
 *
 * 🔴 `walkAll`은 `stage.children`부터 시작하므로 stage는 걷기에 포함되지 않는다. 그래서 stage만
 *    「배경색 하나만 읽히는 특별한 요소」였다 — 판의 배경 **이미지**는 `composeTemplateHtml`이 루트
 *    프레임(=stage)의 `backgroundImage`에 얹으므로, image 배경과 graphic 스냅샷이 PDF·SVG에서
 *    **경고 한 줄 없이 사라졌다**(2026-09-09 실측. 래스터는 stage째 구우므로 정상이었다).
 * 🔑 그래서 여기서 새로 그리지 않고 자식들이 쓰는 `backgroundImagePrimitives`·`reportUnsupported`를
 *    그대로 부른다. 특례를 더하는 것이 아니라 **특례를 없애는 것**이다.
 */
async function plateBackdrop(stage: HTMLElement, context: WalkContext): Promise<VectorPrimitive[]> {
	const style = getComputedStyle(stage)
	const box = toBox(stage.getBoundingClientRect(), context.origin)
	if (box.width <= 0 || box.height <= 0) return []
	// 판에 얹힌 그라디언트·그림자도 자식과 같은 기준으로 진단에 남긴다 — 지금은 바닥색으로 뭉개진다.
	reportUnsupported(style, 'plate', context, { maskHandled: false })
	const backdrop = await backgroundImagePrimitives(stage, box, style, context)
	// 판의 배경 이미지·graphic 스냅샷은 배경 묶음이다 — 묶음을 실으려면 그룹이어야 한다.
	return backdrop.length
		? [
				{
					kind: 'group',
					label: TEMPLATE_BACKGROUND_LAYER,
					layer: TEMPLATE_BACKGROUND_LAYER,
					children: backdrop,
				},
			]
		: []
}

type WalkContext = {
	nodeLayers: ReadonlyMap<string, string>
	origin: DOMRect
	unsupported: { nodeId: string; reason: string }[]
}

async function walkAll(
	nodes: readonly Element[],
	context: WalkContext,
	layer: string,
): Promise<VectorPrimitive[]> {
	const collected: VectorPrimitive[] = []
	for (const node of nodes) {
		if (node instanceof HTMLElement) collected.push(...(await walk(node, context, layer)))
	}
	return collected
}

/** `layer`는 조상에게서 물려받은 묶음이다 — 이 노드가 슬롯이면 거기서부터 자기 묶음으로 바뀐다. */
async function walk(
	element: HTMLElement,
	context: WalkContext,
	inheritedLayer: string,
): Promise<VectorPrimitive[]> {
	const style = getComputedStyle(element)
	if (style.display === 'none' || style.visibility === 'hidden') return []
	// 🔴 값이 없을 때를 0으로 읽으면 판 전체가 사라진다 — `Number('')`은 0이다.
	const parsedOpacity = Number.parseFloat(style.opacity)
	const opacity = Number.isFinite(parsedOpacity) ? parsedOpacity : 1
	if (opacity === 0) return []

	const box = toBox(element.getBoundingClientRect(), context.origin)
	if (box.width <= 0 || box.height <= 0) return []

	const nodeId = element.dataset.nodeId ?? element.dataset.name ?? element.tagName.toLowerCase()
	const layer = context.nodeLayers.get(nodeId) ?? inheritedLayer

	// SVG 자산은 마스크째 도형으로 펴진다 — 그때는 마스크를 「못 옮긴 효과」로 세지 않는다.
	const svgAsset = await svgAssetPrimitives(element, box, style)
	reportUnsupported(style, nodeId, context, { maskHandled: svgAsset !== null })

	// 자산이 <style>·class로만 색을 정하면 fill을 못 읽어 검정으로 나간다 — 사람이 알아야 한다.
	if (svgAsset && (await svgAssetStyleSheetWarning(element, style))) {
		context.unsupported.push({ nodeId, reason: 'svg-stylesheet-fill' })
	}

	// 래스터 마스크는 브라우저가 이미 정확히 합성해 두었다 — 그 결과를 그대로 구워 얹는다.
	// 🔑 자식까지 함께 굽는다(마스크는 하위 트리에 걸린다). 대신 **부모의 칠은 벡터로 남아** 밑에서
	//    비치므로, 2겹인 컬러라이즈도 원본과 같은 그림이 된다.
	if (!svgAsset && maskUrl(style)) {
		const flattened = await flattenToImage(element, box, context)
		return flattened
			? [{ kind: 'group', label: element.dataset.name ?? nodeId, layer, children: flattened }]
			: []
	}

	const own =
		svgAsset ??
		(element instanceof HTMLImageElement
			? await imagePrimitives(element, box, style, context)
			: element.tagName === 'P'
				? textPrimitives(element, style, context)
				: [
						...boxPrimitives(box, style),
						...(await backgroundImagePrimitives(element, box, style, context)),
					])

	const children = await walkAll(Array.from(element.children), context, layer)
	const contents = [...own, ...children]
	if (contents.length === 0) return []

	// 레이어 이름을 살려 둔다 — 인쇄용이라 구조는 깨져도 되지만, 이름은 문제 추적에 쓰인다.
	return [
		{
			kind: 'group',
			label: element.dataset.name ?? nodeId,
			layer,
			...(opacity < 1 ? { opacity } : {}),
			children: contents,
		},
	]
}

/** 벡터로 못 옮기는 효과를 기록한다. 여기서 버리면 폴백이 무엇을 구워야 할지 알 수 없다. */
function reportUnsupported(
	style: CSSStyleDeclaration,
	nodeId: string,
	context: WalkContext,
	{ maskHandled }: { maskHandled: boolean },
) {
	const effects: [string, boolean][] = [
		['gradient', hasRealGradient(style.backgroundImage)],
		['box-shadow', isSet(style.boxShadow)],
		['filter', isSet(style.filter)],
		['backdrop-filter', isSet(style.backdropFilter)],
		['mask', !maskHandled && maskUrl(style) !== null],
		['blend-mode', isSet(style.mixBlendMode, 'normal')],
		['uneven-border', hasUnevenBorder(style)],
	]
	for (const [reason, hit] of effects) {
		if (hit) context.unsupported.push({ nodeId, reason })
	}
}

/**
 * SVG 자산이면 도형으로 펼친다. 두 형태가 있다 —
 * 색을 안 바꾼 로고는 `img[src$=.svg]`, 색을 바꾼 로고는 `div` + `mask-image` + `background-color`다
 * (`compose-template-html`이 그렇게 심는다).
 */
async function svgAssetPrimitives(
	element: HTMLElement,
	box: Box,
	style: CSSStyleDeclaration,
): Promise<VectorPrimitive[] | null> {
	if (element instanceof HTMLImageElement) {
		const source = element.currentSrc || element.src
		return isSvgUrl(source)
			? svgAssetToPrimitives(source, box, { fit: fitOf(style.objectFit) })
			: null
	}
	const mask = maskUrl(style)
	if (!mask || !isSvgUrl(mask)) return null
	// 마스크는 모양만 쓴다 — 색은 배경색이 정한다. 없으면 검정이 인쇄 기본이다.
	const tint = solidColor(style.backgroundColor) ?? '#000000'
	return svgAssetToPrimitives(mask, box, { fit: fitOf(style.maskSize), tint })
}

/** 이 노드가 쓰는 SVG 자산이 스타일시트로만 색을 정하는지. 틴트가 있으면 색을 덮으므로 무관하다. */
async function svgAssetStyleSheetWarning(
	element: HTMLElement,
	style: CSSStyleDeclaration,
): Promise<boolean> {
	const mask = maskUrl(style)
	if (mask) return false
	const source = element instanceof HTMLImageElement ? element.currentSrc || element.src : ''
	return source && isSvgUrl(source) ? svgAssetUsesStyleSheetFill(source) : false
}

function isSvgUrl(value: string): boolean {
	return /\.svg(\?|#|$)/i.test(value)
}

/** CSS의 맞춤 값은 여러 이름을 쓰지만 자산 배치에는 두 가지뿐이다. */
function fitOf(value: string): 'contain' | 'fill' {
	return value.trim().startsWith('contain') ? 'contain' : 'fill'
}

/**
 * CSS 값이 실제로 걸려 있는지. 🔴 값이 없을 때(`undefined`·빈 문자열)를 「걸려 있음」으로 읽으면
 * 아무 효과도 없는 노드가 전부 폴백으로 빠진다 — `Number('')`이 0인 것과 같은 함정이다.
 */
function isSet(value: string | undefined, empty = 'none'): boolean {
	return Boolean(value) && value !== empty && value !== 'none'
}

/** CSS mask로 얹힌 벡터 자산의 URL. 로고가 이 형태로 들어온다(compose가 maskImage로 심는다). */
export function maskUrl(style: CSSStyleDeclaration): string | null {
	const value = style.maskImage || style.webkitMaskImage || ''
	if (!value || value === 'none') return null
	return value.match(/url\(["']?(.*?)["']?\)/)?.[1] ?? null
}

/**
 * 🔴 단색인데 그라디언트로 위장한 레이어를 진짜 그라디언트로 세면 안 된다. Figma importer가
 *    배경 레이어가 여러 겹일 때 SOLID를 `linear-gradient(색,색)`으로 바꿔 넣는다
 *    (`lower-figma-visuals`의 `solidAsLayer`) — 그걸 잡으면 멀쩡한 단색 배경이 전부 래스터로 간다.
 */
export function hasRealGradient(backgroundImage: string): boolean {
	const gradients = backgroundImage.match(
		/(?:linear|radial|conic)-gradient\([^()]*(?:\([^()]*\)[^()]*)*\)/g,
	)
	return (gradients ?? []).some((gradient) => uniformGradientColor(gradient) === null)
}

/** 정지점이 모두 같은 색이면 그 색을 돌려준다 — 사실상 단색 칠이다. */
export function uniformGradientColor(gradient: string): string | null {
	const colors = gradient.match(/#[0-9a-f]{3,8}|rgba?\([^)]*\)/gi)
	if (!colors || colors.length < 2) return null
	const normalized = colors.map((color) => solidColor(color))
	return normalized.every((color) => color !== null && color === normalized[0])
		? normalized[0]
		: null
}

function boxPrimitives(box: Box, style: CSSStyleDeclaration): VectorPrimitive[] {
	// 단색 위장 그라디언트가 실제 칠이면 그 색을 배경색보다 우선한다 — 위에 덮이는 레이어다.
	const layered = firstUniformLayer(style.backgroundImage)
	const fill = layered ?? solidColor(style.backgroundColor)
	const border = borderOf(style)
	if (!fill && !border) return []
	// 위장 그라디언트로 온 색은 그 자체가 불투명한 레이어다 — 배경색 알파를 씌우지 않는다.
	const alpha = layered ? 1 : colorAlpha(style.backgroundColor)
	return [
		{
			kind: 'rect',
			...box,
			...(fill ? { fill } : {}),
			...(border ? { stroke: border.color, strokeWidth: border.width } : {}),
			...(uniformRadius(style) ? { radius: uniformRadius(style) as number } : {}),
			...(alpha < 1 ? { opacity: alpha } : {}),
		},
	]
}

/** 여러 배경 레이어 중 맨 위(CSS에서 먼저 오는) 단색 위장 레이어의 색. */
function firstUniformLayer(backgroundImage: string): string | null {
	const gradients = backgroundImage.match(
		/(?:linear|radial|conic)-gradient\([^()]*(?:\([^()]*\)[^()]*)*\)/g,
	)
	for (const gradient of gradients ?? []) {
		const color = uniformGradientColor(gradient)
		if (color) return color
	}
	return null
}

async function imagePrimitives(
	element: HTMLImageElement,
	box: Box,
	style: CSSStyleDeclaration,
	context: WalkContext,
): Promise<VectorPrimitive[]> {
	const source = element.currentSrc || element.src
	return source ? bakedImage(source, box, fitOfCss(style.objectFit), element, context) : []
}

/**
 * `div`의 배경 이미지. 🔴 Figma importer는 IMAGE fill을 `img`가 아니라 **`background-image`** 로
 * 내린다(`createImageFillStyle`) — 이것을 안 보면 판에서 사진이 통째로 빠진다.
 */
async function backgroundImagePrimitives(
	element: HTMLElement,
	box: Box,
	style: CSSStyleDeclaration,
	context: WalkContext,
): Promise<VectorPrimitive[]> {
	const source = cssUrl(style.backgroundImage)
	// 마스크로 얹힌 자산은 SVG 경로가 이미 다뤘고, 여기서 또 그리면 두 번 얹힌다.
	if (!source || maskUrl(style)) return []
	return bakedImage(source, box, fitOfCss(style.backgroundSize), element, context)
}

async function bakedImage(
	source: string,
	box: Box,
	fit: ImageFit,
	element: HTMLElement,
	context: WalkContext,
): Promise<VectorPrimitive[]> {
	// 조상 프레임이 자르는 만큼만 싣는다 — 클립 경로 대신 비트맵에서 잘라 낸다.
	const visible = intersect(box, clipBoxOf(element, context.origin))
	if (!visible || visible.width <= 0 || visible.height <= 0) return []
	// crop은 **상자 안에서의** 좌표다 — 판 좌표를 그대로 넘기면 엉뚱한 데를 잘라 낸다.
	const crop = {
		x: visible.x - box.x,
		y: visible.y - box.y,
		width: visible.width,
		height: visible.height,
	}
	const href = await toBakedImageDataUrl(source, box, fit, crop)
	// 🔑 맞춤은 굽는 쪽이 이미 반영했다 — 여기서 또 비율을 맞추면 두 번 적용된다.
	return href ? [{ kind: 'image', ...visible, href, preserveAspectRatio: 'none' }] : []
}

/**
 * 굽는 배율. 🔴 인쇄 목표 해상도를 모른 채 굽는다 —
 * ponytail: 그 문제는 「인쇄 치수 계약」(farnext §1-2)이 소유한다. 여기서 정하지 않는다.
 */
const FLATTEN_SCALE = 3

/**
 * 노드를 하위 트리째 이미지로 굽는다. 마스크 밖은 투명하게 남으므로 알파 PNG가 되고, 밑에 깔린
 * 벡터가 그대로 비친다.
 * 🔴 구운 것은 **요소 전체**다. 조상이 자른 만큼 비트맵에서도 잘라야 한다 — 잘린 상자에 그대로
 *    밀어 넣으면 그림이 찌그러진다(2026-08-27: 3462×1932가 630×644에 들어가 가로 0.55배가 됐다).
 */
async function flattenToImage(
	element: HTMLElement,
	box: Box,
	context: WalkContext,
): Promise<VectorPrimitive[] | null> {
	const visible = intersect(box, clipBoxOf(element, context.origin))
	if (!visible || visible.width <= 0 || visible.height <= 0) return null
	try {
		const baked = await toPng(element, { pixelRatio: FLATTEN_SCALE })
		const cropped =
			visible.width === box.width && visible.height === box.height
				? baked
				: await cropBakedImage(
						baked,
						{
							x: visible.x - box.x,
							y: visible.y - box.y,
							width: visible.width,
							height: visible.height,
						},
						FLATTEN_SCALE,
					)
		return cropped
			? [{ kind: 'image', ...visible, href: cropped, preserveAspectRatio: 'none' }]
			: null
	} catch {
		return null
	}
}

/** 이 요소를 실제로 자르는 가장 가까운 조상의 상자. 아무도 안 자르면 null이다. */
function clipBoxOf(element: HTMLElement, origin: DOMRect): Box | null {
	// 🔴 자기 자신부터 본다 — Figma의 고정 크기 텍스트는 `<p style="overflow:hidden">`으로 내려와
	//    자기 글자를 자른다. 부모만 보면 화면에서 잘린 문장이 인쇄물에 되살아난다.
	// 🔴 첫 클립에서 멈추지 않는다 — 더 위에 더 좁은 프레임이 있으면 그것도 함께 자른다.
	let clip: Box | null = null
	for (let node: HTMLElement | null = element; node; node = node.parentElement) {
		const overflow = getComputedStyle(node).overflow
		if (!overflow || overflow === 'visible') continue
		const box = toBox(node.getBoundingClientRect(), origin)
		clip = clip ? intersect(clip, box) : box
		// 교차가 비면 이 요소는 어디에도 안 보인다 — 더 볼 것이 없다.
		if (!clip) return { x: 0, y: 0, width: 0, height: 0 }
	}
	return clip
}

function intersect(box: Box, clip: Box | null): Box | null {
	if (!clip) return box
	const x = Math.max(box.x, clip.x)
	const y = Math.max(box.y, clip.y)
	const right = Math.min(box.x + box.width, clip.x + clip.width)
	const bottom = Math.min(box.y + box.height, clip.y + clip.height)
	return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null
}

/** 첫 번째 `url(...)` 값. 그라디언트 레이어가 섞여 있어도 이미지만 집는다. */
function cssUrl(value: string): string | null {
	return value && value !== 'none' ? (value.match(/url\(["']?(.*?)["']?\)/)?.[1] ?? null) : null
}

function fitOfCss(value: string): ImageFit {
	const first = value.trim().split(',')[0]?.trim() ?? ''
	if (first.startsWith('contain')) return 'contain'
	if (first.startsWith('cover')) return 'cover'
	return 'fill'
}

/**
 * 문단을 **줄 단위**로 뽑는다. 문단 하나를 `<text>` 하나로 내면 원래 줄바꿈이 사라지고,
 * 받는 쪽 서체 폭에 따라 다시 흘러 조판이 달라진다.
 */
function textPrimitives(
	element: HTMLElement,
	style: CSSStyleDeclaration,
	context: WalkContext,
): VectorPrimitive[] {
	const fill = solidColor(style.color) ?? '#000000'
	const fontSize = Number.parseFloat(style.fontSize) || 0
	if (fontSize <= 0) return []
	const anchor = textAnchorOf(style.textAlign)
	const alpha = colorAlpha(style.color)
	// 🔴 브라우저는 잘린 줄도 레이아웃해 둔다 — `getClientRects()`가 그 줄까지 돌려주므로,
	//    클립을 안 보면 화면에 없는 문장이 판에 실려 아래 요소를 덮는다.
	//    줄 단위 판정이다(반쯤 걸친 줄은 통째로 남는다) — clipPath를 쓰지 않는다는 원칙 때문이다.
	const clip = clipBoxOf(element, context.origin)

	return lineRects(element).flatMap(({ rect, text }) => {
		const box = toBox(rect, context.origin)
		if (!text.trim() || box.width <= 0) return []
		if (!intersect(box, clip)) return []
		return [
			{
				kind: 'text' as const,
				x:
					anchor === 'middle'
						? box.x + box.width / 2
						: anchor === 'end'
							? box.x + box.width
							: box.x,
				// baseline은 줄 상자 바닥에서 descent만큼 올린 자리다. 정확한 descent는 서체를 열어야
				// 알 수 있어서, 아웃라인 단계가 실측으로 덮는다(여기 값은 미리보기용 근사다).
				y: box.y + box.height - fontSize * 0.21,
				text,
				fontFamily: style.fontFamily,
				fontSize,
				...(Number(style.fontWeight) ? { fontWeight: Number(style.fontWeight) } : {}),
				...(letterSpacingOf(style) !== null
					? { letterSpacing: letterSpacingOf(style) as number }
					: {}),
				fill,
				...(alpha < 1 ? { opacity: alpha } : {}),
				...(anchor !== 'start' ? { textAnchor: anchor } : {}),
			},
		]
	})
}

/**
 * 텍스트 노드를 **렌더된 줄**로 자른다.
 *
 * 🔑 줄은 브라우저가 이미 나눠 두었다 — `getClientRects()`의 개수가 곧 줄 수다. 경계 인덱스만
 *    이분 탐색으로 찾아 글자를 짝지운다. 글자마다 재면 문단 하나에 레이아웃 읽기가 수백 번 걸린다.
 */
function lineRects(element: HTMLElement): { rect: DOMRect; text: string }[] {
	const ownerDocument = element.ownerDocument
	const walker = ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT)
	const lines: { rect: DOMRect; text: string }[] = []

	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const content = node.textContent ?? ''
		if (!content.trim()) continue
		const range = ownerDocument.createRange()
		range.selectNodeContents(node)
		if (range.getClientRects().length <= 1) {
			lines.push({ rect: range.getBoundingClientRect(), text: content })
			continue
		}

		let start = 0
		while (start < content.length) {
			const breakAt = findLineBreak(range, node, start, content.length)
			range.setStart(node, start)
			range.setEnd(node, breakAt)
			lines.push({ rect: range.getBoundingClientRect(), text: content.slice(start, breakAt) })
			if (breakAt === start) break
			start = breakAt
		}
	}
	return lines
}

/**
 * `start`에서 시작하는 줄이 끝나는 인덱스. 범위를 늘리다 줄 상자가 2개가 되는 첫 지점 직전이다.
 * 「상자 개수 ≥ 2」는 끝 인덱스에 대해 단조라서 이분 탐색이 성립한다.
 */
function findLineBreak(range: Range, node: Node, start: number, length: number): number {
	range.setStart(node, start)
	range.setEnd(node, length)
	if (range.getClientRects().length <= 1) return length

	let low = start + 1
	let high = length
	while (low < high) {
		const middle = (low + high) >> 1
		range.setEnd(node, middle)
		if (range.getClientRects().length > 1) high = middle
		else low = middle + 1
	}
	// low는 줄이 넘어간 첫 인덱스다 — 그 직전까지가 이 줄이다.
	return Math.max(start + 1, low - 1)
}

function toBox(rect: DOMRect, origin: DOMRect): Box {
	return {
		x: rect.left - origin.left,
		y: rect.top - origin.top,
		width: rect.width,
		height: rect.height,
	}
}

/**
 * 색의 알파. 🔴 이것을 버리면 반투명 칠이 100% 농도로 인쇄된다 — 캔버스 디머가
 * `rgba(0,0,0,0.4)`로 들어오는데(`compose-template-html`의 `applyCanvasDimmer`),
 * 알파를 잃으면 **판 전체가 새까맣게** 나가고 경고도 뜨지 않는다.
 */
export function colorAlpha(value: string): number {
	const parts = value.match(/rgba?\(([^)]+)\)/)?.[1]
	if (!parts) return 1
	const numbers = parts
		.split(/[,/\s]+/)
		.filter(Boolean)
		.map(Number)
	const alpha = numbers[3]
	return Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1
}

/** 투명하지 않은 단색만 돌려준다 — `rgba(0,0,0,0)`은 배경 없음이지 검정이 아니다. */
export function solidColor(value: string): string | null {
	const match = value.match(/rgba?\(([^)]+)\)/)
	if (!match) return value.startsWith('#') ? value : null
	const parts = match[1]
		.split(/[,/\s]+/)
		.filter(Boolean)
		.map(Number)
	const [r, g, b, a = 1] = parts
	if (!Number.isFinite(r) || a === 0) return null
	return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
}

/**
 * 🔴 rect의 stroke는 **네 변이 같을 때만** 참이다. Figma의 `individualStrokeWeights`는 한 변짜리
 *    밑줄을 만들 수 있는데, 그것을 균일 테두리로 그리면 화면에 없는 사각 상자가 생긴다.
 *    실측 0건이라 변별 테두리를 그리는 코드는 만들지 않았다 — 대신 만나면 경고한다.
 */
function borderWidths(style: CSSStyleDeclaration) {
	const read = (value: string) => Number.parseFloat(value) || 0
	return {
		top: read(style.borderTopWidth),
		right: read(style.borderRightWidth),
		bottom: read(style.borderBottomWidth),
		left: read(style.borderLeftWidth),
	}
}

export function hasUnevenBorder(style: CSSStyleDeclaration): boolean {
	const sides = Object.values(borderWidths(style))
	return sides.some((side) => side > 0) && new Set(sides).size > 1
}

function borderOf(style: CSSStyleDeclaration): { color: string; width: number } | null {
	const { top } = borderWidths(style)
	const color = solidColor(style.borderTopColor)
	return top > 0 && color && style.borderTopStyle !== 'none' ? { color, width: top } : null
}

/** SVG `rx`는 네 모서리가 같을 때만 참이다 — 다르면 path로 내려가야 하므로 여기서는 포기한다. */
function uniformRadius(style: CSSStyleDeclaration): number | null {
	const corners = [
		style.borderTopLeftRadius,
		style.borderTopRightRadius,
		style.borderBottomRightRadius,
		style.borderBottomLeftRadius,
	].map((value) => Number.parseFloat(value) || 0)
	const [first] = corners
	return first > 0 && corners.every((corner) => corner === first) ? first : null
}

function textAnchorOf(textAlign: string): 'start' | 'middle' | 'end' {
	if (textAlign === 'center') return 'middle'
	if (textAlign === 'right' || textAlign === 'end') return 'end'
	return 'start'
}

function letterSpacingOf(style: CSSStyleDeclaration): number | null {
	const value = Number.parseFloat(style.letterSpacing)
	return Number.isFinite(value) && value !== 0 ? value : null
}
