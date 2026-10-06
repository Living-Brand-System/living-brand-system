import type {
	FigmaEffect,
	FigmaPaint,
	FigmaRenderedAsset,
	IrCssStyle,
	FigmaSourceNode as Node,
} from './figma-ir'

/**
 * 시각/레이아웃 속성 lowering: Figma 노드의 개별 속성을 CSS 선언으로 옮기는 순수 함수 모음.
 *
 * 원칙: 재해석하지 않는다. Figma가 노드에 실어 주는 속성을 CSS로 "그대로" 옮기는 것이 목표이고,
 * 그래서 특정 속성만 골라 담지 않고 Dev Mode 인스펙트에 나타나는 시각 속성 전부(레이아웃/박스/타이포)를
 * naive하게 매핑한다. 디자인이 이상해 보이면 디자이너가 Figma에서 고치고, 변환 결과가 원본과 "다르면"
 * 그건 이 파일의 버그다.
 *
 * 여기 있는 함수는 전부 순수하다 — I/O 없음, 트리 순회 없음. 트리 판단은 normalize가 소유한다.
 */

// CSS 값 변환

interface FigmaGradientPaint extends FigmaPaint {
	gradientStops?: { color: { r: number; g: number; b: number; a?: number }; position?: number }[]
	gradientHandlePositions?: { x: number; y: number }[]
}

/** CSS로 내보내는 수치를 소수 둘째 자리로 반올림한다(부동소수 잔재 방지). */
export const roundCssNumber = (n: number) => Math.round(n * 100) / 100

/** Figma 0~1 색상 + 불투명도 → rgb()/rgba() 문자열. 알파 1이면 rgb로 줄인다. */
function formatRgba(
	color?: { r: number; g: number; b: number; a?: number },
	opacity = 1,
): string | undefined {
	if (!color) return undefined
	const c = (v: number) => Math.round(v * 255)
	const a = roundCssNumber((color.a ?? 1) * opacity)
	return a >= 1
		? `rgb(${c(color.r)},${c(color.g)},${c(color.b)})`
		: `rgba(${c(color.r)},${c(color.g)},${c(color.b)},${a})`
}

/** visible이 명시적으로 false가 아니면 보이는 것으로 본다(Figma 기본값). */
const isVisible = (p: { visible?: boolean }) => p.visible !== false

// SOLID 페인트 → 색. gradient/image는 background()가 따로 처리.
function findSolidColor(paints?: FigmaPaint[]): string | undefined {
	const p = paints?.find((x) => x.type === 'SOLID' && isVisible(x))
	return p ? formatRgba(p.color, p.opacity ?? 1) : undefined
}

// linear/radial gradient → CSS. 색 정지점은 정확하고, paint 불투명도를 정지점 알파에 곱한다.
// ponytail: linear 각도는 핸들 벡터 근사. radial/diamond는 CSS 기본(중앙 ellipse)으로 근사 — 중심/반경/모양 핸들은 무시. 편차 나면 여기 보정.
function createGradientCss(paint: FigmaGradientPaint): string | undefined {
	const stops = paint.gradientStops
	if (!stops?.length) return undefined
	const op = paint.opacity ?? 1
	const stopStr = stops
		.map((s) => `${formatRgba(s.color, op)} ${roundCssNumber((s.position ?? 0) * 100)}%`)
		.join(',')
	if (paint.type === 'GRADIENT_RADIAL' || paint.type === 'GRADIENT_DIAMOND') {
		return `radial-gradient(${stopStr})`
	}
	// GRADIENT_LINEAR: 시작→끝 핸들로 각도(0deg=위, 시계방향). y축은 아래로 증가.
	const h = paint.gradientHandlePositions
	let angle = 180
	if (h && h.length >= 2) {
		const dx = h[1].x - h[0].x
		const dy = h[1].y - h[0].y
		angle = Math.round((Math.atan2(dx, -dy) * 180) / Math.PI)
	}
	return `linear-gradient(${angle}deg,${stopStr})`
}

// 시각 스타일 변환

/** 노드가 소비하는 fill 목록: fills(모던) → background(레거시) 순으로 고르고 보이는 paint만 남긴다. */
function findVisibleFills(node: Node): FigmaPaint[] {
	const paints = node.fills?.length ? node.fills : node.background
	return paints?.filter(isVisible) ?? []
}

/**
 * CSS background-image로 낮출 수 있는 IMAGE fill을 돌려준다 — 조건: 비텍스트 노드 + 보이는 fill의
 * **맨 위**가 imageRef 있는 IMAGE이고, 그 아래는 없거나 SOLID 하나뿐. plan(에셋 수집)과
 * lowering(스타일 생성)이 같은 판정을 공유해야 "수집했는데 못 그리는" 또는 "그리려는데 수집 안 된"
 * 어긋남이 생기지 않는다.
 * 🔑 SOLID 아래 + IMAGE 위는 CSS 그대로다(`background-color` 위에 `background-image`). Figma에서 프레임에
 *    이미지 fill을 얹으면 흔히 이 모양이 되는데, 예전엔 래스터로 보내 **루트면 템플릿 전체가 PNG 한 장**이
 *    됐다(2026-10-06, hd_lbs_templates Poster_Type3·4 — 텍스트·로고까지 편집 불가).
 * (TEXT의 IMAGE fill은 글리프 색이라 배경으로 표현 불가 → 제외. 그 밖의 다중 fill+IMAGE는 검증기가
 * background-image에 단일 url만 허용해 표현 불가 → 제외. 둘 다 plan에서 래스터로 남는다.)
 */
export function findCssLowerableImageFill(node: Node): FigmaPaint | undefined {
	if (node.type === 'TEXT') return undefined
	const fills = findVisibleFills(node)
	const under = fills.slice(0, -1)
	if (under.length > 1 || under.some((paint) => paint.type !== 'SOLID')) return undefined
	const paint = fills.at(-1)
	return paint?.type === 'IMAGE' && paint.imageRef ? paint : undefined
}

/** SOLID paint를 다중 배경 레이어에 끼울 수 있는 단색 gradient로 바꾼다(background 레이어는 이미지만 허용). */
function solidAsLayer(paint: FigmaPaint): string | undefined {
	const color = formatRgba(paint.color, paint.opacity ?? 1)
	return color ? `linear-gradient(${color},${color})` : undefined
}

/** IMAGE fill의 scaleMode → background 크기/반복. FILL=cover, FIT=contain, STRETCH=늘림, TILE=반복. */
// ponytail: TILE의 scalingFactor, imageTransform(CROP), filters(노출 등)는 무시 — 편차 나면 여기 보정.
function createImageFillStyle(paint: FigmaPaint, url: string): IrCssStyle {
	const size: Record<string, string> = {
		FILL: 'cover',
		FIT: 'contain',
		STRETCH: '100% 100%',
		TILE: 'auto',
	}
	return {
		'background-image': `url(${url})`,
		'background-size': size[paint.scaleMode ?? 'FILL'] ?? 'cover',
		'background-position': 'center',
		'background-repeat': paint.scaleMode === 'TILE' ? 'repeat' : 'no-repeat',
	}
}

/**
 * 노드 배경 lowering 체인: 각 fill 구성을 반드시 렌더 가능한 CSS 하나로 떨어뜨린다.
 * - fill 없음 → 레거시 backgroundColor
 * - SOLID/GRADIENT 하나 → background 단일 값 (기존 출력과 동일)
 * - IMAGE 하나(해석된 에셋) → background-image 4종 longhand + 발행 승격용 fillAsset 참조
 *   (아래에 SOLID가 하나 깔려 있으면 그 색을 background-color로 함께 낸다)
 * - SOLID/GRADIENT 스택 → background 다중 레이어 (fills는 아래→위, CSS는 위→아래라 역순)
 * - 그 외(IMAGE 미해석·PATTERN 등)는 plan이 래스터로 보내므로 여기 도달 시 backgroundColor로 방어
 */
export function lowerNodeBackground(
	node: Node,
	imageFillAssets: Readonly<Record<string, FigmaRenderedAsset>> = {},
): { style: IrCssStyle; fillAsset?: FigmaRenderedAsset } {
	const fills = findVisibleFills(node)
	if (fills.length === 0) return { style: { background: formatRgba(node.backgroundColor) } }

	const imageFill = findCssLowerableImageFill(node)
	const asset = imageFill?.imageRef ? imageFillAssets[imageFill.imageRef] : undefined
	if (imageFill && asset) {
		const base =
			fills.length === 2 ? formatRgba(fills[0]?.color, fills[0]?.opacity ?? 1) : undefined
		return {
			style: {
				...(base ? { 'background-color': base } : {}),
				...createImageFillStyle(imageFill, asset.url),
			},
			fillAsset: asset,
		}
	}

	if (fills.length === 1) {
		const paint = fills[0]
		if (paint.type === 'SOLID') {
			return { style: { background: formatRgba(paint.color, paint.opacity ?? 1) } }
		}
		if (paint.type.startsWith('GRADIENT')) {
			return { style: { background: createGradientCss(paint) } }
		}
		return { style: { background: formatRgba(node.backgroundColor) } }
	}

	const layers = [...fills].reverse().map((paint) => {
		if (paint.type === 'SOLID') return solidAsLayer(paint)
		if (paint.type.startsWith('GRADIENT')) return createGradientCss(paint)
		return undefined
	})
	if (layers.some((layer) => !layer)) {
		return { style: { background: formatRgba(node.backgroundColor) } }
	}
	return { style: { background: layers.join(',') } }
}

/**
 * 노드가 CSS border로 방출하는 네 변의 두께. border가 없으면 0.
 * CSS absolute 자식은 부모의 padding box(border 안쪽) 기준으로 배치되지만 Figma의 INSIDE stroke는
 * 자식 좌표에 영향을 주지 않으므로, 자식 배치가 이 두께만큼 좌표계를 되돌리는 데 쓴다.
 */
function findBorderInsets(node: Node): {
	top: number
	right: number
	bottom: number
	left: number
} {
	if (!findSolidColor(node.strokes)) return { top: 0, right: 0, bottom: 0, left: 0 }
	const iw = node.individualStrokeWeights
	if (iw) return iw
	const weight = node.strokeWeight ?? 1
	return { top: weight, right: weight, bottom: weight, left: weight }
}

// strokes → border. 개별 두께가 있으면 변별 두께로.
// ponytail: strokeAlign(INSIDE/OUTSIDE/CENTER)은 무시하고 border-box border(=INSIDE)로 근사. OUTSIDE/CENTER는 CSS border로 충실 표현 불가.
function createBorderStyle(node: Node): IrCssStyle {
	const color = findSolidColor(node.strokes)
	if (!color) return {}
	const iw = node.individualStrokeWeights
	if (iw) {
		return {
			'border-style': 'solid',
			'border-color': color,
			'border-top-width': `${roundCssNumber(iw.top)}px`,
			'border-right-width': `${roundCssNumber(iw.right)}px`,
			'border-bottom-width': `${roundCssNumber(iw.bottom)}px`,
			'border-left-width': `${roundCssNumber(iw.left)}px`,
		}
	}
	return { border: `${roundCssNumber(node.strokeWeight ?? 1)}px solid ${color}` }
}

// effects → box-shadow(그림자) + filter(레이어 블러) + backdrop-filter(배경 블러).
function createEffectStyle(effects?: FigmaEffect[]): IrCssStyle {
	if (!effects?.length) return {}
	const shadows: string[] = []
	let filter: string | undefined
	let backdrop: string | undefined
	for (const e of effects) {
		if (e.visible === false) continue
		const o = e.offset ?? { x: 0, y: 0 }
		const color = formatRgba(e.color) ?? 'rgba(0,0,0,0.25)'
		if (e.type === 'DROP_SHADOW') {
			shadows.push(
				`${roundCssNumber(o.x)}px ${roundCssNumber(o.y)}px ${roundCssNumber(e.radius ?? 0)}px ${roundCssNumber(e.spread ?? 0)}px ${color}`,
			)
		} else if (e.type === 'INNER_SHADOW') {
			shadows.push(
				`inset ${roundCssNumber(o.x)}px ${roundCssNumber(o.y)}px ${roundCssNumber(e.radius ?? 0)}px ${roundCssNumber(e.spread ?? 0)}px ${color}`,
			)
		} else if (e.type === 'LAYER_BLUR') {
			filter = `blur(${roundCssNumber(e.radius ?? 0)}px)`
		} else if (e.type === 'BACKGROUND_BLUR') {
			backdrop = `blur(${roundCssNumber(e.radius ?? 0)}px)`
		}
	}
	return {
		'box-shadow': shadows.length ? shadows.join(',') : undefined,
		filter,
		'backdrop-filter': backdrop,
	}
}

// Figma blend mode → CSS mix-blend-mode. NORMAL/PASS_THROUGH는 생략.
const BLEND: Record<string, string> = {
	MULTIPLY: 'multiply',
	SCREEN: 'screen',
	OVERLAY: 'overlay',
	DARKEN: 'darken',
	LIGHTEN: 'lighten',
	COLOR_DODGE: 'color-dodge',
	COLOR_BURN: 'color-burn',
	HARD_LIGHT: 'hard-light',
	SOFT_LIGHT: 'soft-light',
	DIFFERENCE: 'difference',
	EXCLUSION: 'exclusion',
	HUE: 'hue',
	SATURATION: 'saturation',
	COLOR: 'color',
	LUMINOSITY: 'luminosity',
}

/** 개별 4코너(rectangleCornerRadii) 우선, 없으면 단일 cornerRadius → border-radius 값. */
function resolveBorderRadius(node: Node): string | undefined {
	const r = node.rectangleCornerRadii
	if (r && r.length === 4)
		return `${roundCssNumber(r[0])}px ${roundCssNumber(r[1])}px ${roundCssNumber(r[2])}px ${roundCssNumber(r[3])}px`
	if (node.cornerRadius) return `${roundCssNumber(node.cornerRadius)}px`
	return undefined
}

// 노드 종류 무관 공통 박스 속성(배경 제외 — 배경은 컨테이너/텍스트 다르게).
export function createBoxStyle(node: Node): IrCssStyle {
	return {
		opacity:
			node.opacity != null && node.opacity < 1
				? String(roundCssNumber(node.opacity))
				: undefined,
		// Figma와 CSS의 양수 회전 방향이 반대이므로 degree 값의 부호만 반전한다.
		transform: node.rotation ? `rotate(${roundCssNumber(-node.rotation)}deg)` : undefined,
		'border-radius': resolveBorderRadius(node),
		overflow: node.clipsContent ? 'hidden' : undefined,
		'mix-blend-mode': node.blendMode ? BLEND[node.blendMode] : undefined,
		...createBorderStyle(node),
		...createEffectStyle(node.effects),
	}
}

// 컨테이너 레이아웃 변환

const AXIS_ALIGN: Record<string, string> = {
	MIN: 'flex-start',
	CENTER: 'center',
	MAX: 'flex-end',
	SPACE_BETWEEN: 'space-between',
	BASELINE: 'baseline',
}

// MIN/CENTER/MAX/STRETCH/AUTO만 CSS로 옮기고, INHERIT 등은 키가 없어 자연히 생략된다.
const SELF_ALIGN: Record<string, string | undefined> = {
	MIN: 'start',
	CENTER: 'center',
	MAX: 'end',
	STRETCH: 'stretch',
	AUTO: 'start',
}

/** 노드 자신의 레이아웃 모드(GRID/flex/없음)를 display·gap·padding·정렬 CSS로 옮긴다. */
export function createContainerStyle(node: Node): IrCssStyle {
	const pad = `${node.paddingTop ?? 0}px ${node.paddingRight ?? 0}px ${node.paddingBottom ?? 0}px ${node.paddingLeft ?? 0}px`

	if (node.layoutMode === 'GRID') {
		return {
			display: 'grid',
			'grid-template-columns': node.gridColumnsSizing?.trim(),
			'grid-template-rows': node.gridRowsSizing?.trim(),
			'column-gap': `${node.gridColumnGap ?? 0}px`,
			'row-gap': `${node.gridRowGap ?? 0}px`,
			'grid-auto-flow': node.gridItemsPositioning === 'COLUMN_AUTO_FLOW' ? 'column' : 'row',
			padding: pad,
		}
	}
	if (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL') {
		const horizontal = node.layoutMode === 'HORIZONTAL'
		return {
			display: 'flex',
			'flex-direction': horizontal ? 'row' : 'column',
			'flex-wrap': node.layoutWrap === 'WRAP' ? 'wrap' : undefined,
			'column-gap': `${horizontal ? (node.itemSpacing ?? 0) : (node.counterAxisSpacing ?? 0)}px`,
			'row-gap': `${horizontal ? (node.counterAxisSpacing ?? 0) : (node.itemSpacing ?? 0)}px`,
			'justify-content': AXIS_ALIGN[node.primaryAxisAlignItems ?? ''],
			'align-items': AXIS_ALIGN[node.counterAxisAlignItems ?? ''],
			'align-content':
				node.layoutWrap === 'WRAP' && node.counterAxisAlignContent === 'SPACE_BETWEEN'
					? 'space-between'
					: undefined,
			padding: pad,
		}
	}
	return {} // layoutMode 없음 → 자식이 절대배치
}

/**
 * 텍스트 노드의 말줄임(…) 의도·고정 박스(fixedBox) 판정과 -webkit-line-clamp 줄 수 유도 — 이 판단의 단일 소유자.
 * 줄 수는 maxLines 우선, 없으면 고정 박스 높이 ÷ Figma가 계산한 줄높이(px)로 유도한다.
 * truncates인데 lineClamp가 없으면 말줄임 의도가 overflow:hidden clip으로만 강등된다는 뜻 —
 * createTextStyle은 그대로 clip을 남기고, planFigmaAssets는 이를 진단으로 알린다.
 */
export function resolveTextTruncation(node: Node): {
	truncates: boolean
	fixedBox: boolean
	lineClamp?: number
} {
	const s = node.style ?? {}
	// auto-resize가 꺼진(NONE/생략/레거시 TRUNCATE) 고정 박스 — 넘친 텍스트가 박스에서 잘린다.
	const fixedBox =
		!s.textAutoResize || s.textAutoResize === 'NONE' || s.textAutoResize === 'TRUNCATE'
	const truncates = s.textTruncation === 'ENDING' || s.textAutoResize === 'TRUNCATE'
	if (!truncates) return { truncates, fixedBox }
	if (s.maxLines) return { truncates, fixedBox, lineClamp: s.maxLines }
	if (fixedBox && s.lineHeightPx && node.absoluteBoundingBox) {
		// 마지막 줄은 줄간격 전체가 아니라 글리프 높이(≈fontSize)만 들어가면 Figma가 그린다 —
		// floor(높이÷줄높이)는 329px÷110px(줄간격 110·글자 100)처럼 1px 모자란 박스에서
		// 마지막 줄을 통째로 날려, Figma에 없는 말줄임을 만든다.
		const lastLineHeight = s.fontSize ?? s.lineHeightPx
		return {
			truncates,
			fixedBox,
			lineClamp: Math.max(
				1,
				Math.floor((node.absoluteBoundingBox.height - lastLineHeight) / s.lineHeightPx) + 1,
			),
		}
	}
	// ponytail: 줄높이 px가 없으면 줄 수 유도 불가 → clamp 없이 overflow:hidden clip만 남는다.
	return { truncates, fixedBox }
}

/** 스타일 이름 → CSS 웨이트. 합성 이름이 있어 순서가 값이다(ExtraBold가 Bold보다 먼저). */
const STYLE_NAME_WEIGHTS: ReadonlyArray<readonly [RegExp, number]> = [
	[/thin|hairline/i, 100],
	[/(extra|ultra) ?light/i, 200],
	[/(semi|demi) ?bold/i, 600],
	[/(extra|ultra) ?bold/i, 800],
	[/black|heavy/i, 900],
	[/light|-lt$/i, 300],
	[/medium|-md$/i, 500],
	[/bold|-bd$/i, 700],
]

/**
 * 웨이트의 정본은 숫자가 아니라 디자이너가 고른 스타일 이름이다 — HD OTF처럼 웨이트를
 * 이름으로만 나르는(OS/2 usWeightClass가 세 웨이트 모두 400인) 패밀리는 Figma가
 * fontWeight를 400으로 내려 Bold/Light 구분이 통째로 사라진다. 이름이 숫자와 어긋나면
 * 이름이 이기고, 이름에서 웨이트를 못 읽으면(Regular 등) 숫자로 돌아간다.
 */
function weightFromStyleName(s: NonNullable<Node['style']>): number | undefined {
	const name = s.fontStyle ?? s.fontPostScriptName
	if (!name) return undefined
	return STYLE_NAME_WEIGHTS.find(([re]) => re.test(name))?.[1]
}

/** 텍스트 노드의 타이포 속성(폰트/색/정렬/줄높이/장식) → CSS. */
export function createTextStyle(node: Node): IrCssStyle {
	const s = node.style ?? {}
	const italic = s.italic || /italic/i.test(s.fontStyle ?? '')
	const fontWeight = weightFromStyleName(s) ?? s.fontWeight

	// line-height: PIXELS=px, INTRINSIC_%(자동)=normal, FONT_SIZE_%=상대%.
	let lineHeight: string | undefined
	if (s.lineHeightUnit === 'PIXELS' && s.lineHeightPx)
		lineHeight = `${roundCssNumber(s.lineHeightPx)}px`
	else if (s.lineHeightUnit === 'FONT_SIZE_%' && s.lineHeightPercentFontSize)
		lineHeight = `${roundCssNumber(s.lineHeightPercentFontSize)}%`
	else if (s.lineHeightUnit === 'INTRINSIC_%') lineHeight = 'normal'
	else if (s.lineHeightPx) lineHeight = `${roundCssNumber(s.lineHeightPx)}px`

	const textCase: Record<string, string> = {
		UPPER: 'uppercase',
		LOWER: 'lowercase',
		TITLE: 'capitalize',
	}
	const textDeco: Record<string, string> = {
		UNDERLINE: 'underline',
		STRIKETHROUGH: 'line-through',
	}
	// 세로 정렬: 고정 높이 박스의 CENTER/BOTTOM을 flex 세로 배치로 옮긴다(익명 텍스트가 flex item이 된다).
	// TOP은 기본 흐름과 같아 생략하고, 높이가 내용에 맞는(HUG) 박스에서는 세 값 모두 결과가 같다.
	const verticalAlign: Record<string, string> = { CENTER: 'center', BOTTOM: 'flex-end' }
	const justify = s.textAlignVertical ? verticalAlign[s.textAlignVertical] : undefined

	// Figma 텍스트 박스의 넘침 재현: 고정 박스(fixedBox)는 박스에서 잘리고,
	// textTruncation ENDING(레거시 TRUNCATE 포함)은 -webkit-line-clamp로 「…」 말줄임을 그린다.
	// 두 판정 모두 resolveTextTruncation(단일 소유자)이 한다.
	const { fixedBox, lineClamp } = resolveTextTruncation(node)

	return {
		margin: '0',
		// ponytail: 텍스트 색은 SOLID fill만. gradient/image 텍스트 fill은 색 없이 상속(background-clip:text 미구현).
		color: findSolidColor(node.fills),
		'font-family': s.fontFamily ? `"${s.fontFamily}"` : undefined,
		'font-size': s.fontSize ? `${roundCssNumber(s.fontSize)}px` : undefined,
		'font-weight': fontWeight ? String(fontWeight) : undefined,
		'font-style': italic ? 'italic' : undefined,
		'line-height': lineHeight,
		// Figma JUSTIFIED의 CSS 값은 justify — 소문자화만으로는 무효 값(justified)이 된다.
		'text-align':
			s.textAlignHorizontal === 'JUSTIFIED'
				? 'justify'
				: s.textAlignHorizontal?.toLowerCase(),
		'letter-spacing': s.letterSpacing ? `${roundCssNumber(s.letterSpacing)}px` : undefined,
		'text-transform': s.textCase ? textCase[s.textCase] : undefined,
		'text-decoration': s.textDecoration ? textDeco[s.textDecoration] : undefined,
		// HUG(WIDTH_AND_HEIGHT)=자동 줄바꿈 없이 명시 줄바꿈만(pre), 그 외=자동 줄바꿈 허용(pre-wrap). 둘 다 공백/개행 보존.
		'white-space': s.textAutoResize === 'WIDTH_AND_HEIGHT' ? 'pre' : 'pre-wrap',
		...(lineClamp
			? {
					// clamp의 -webkit-box는 flex 세로 정렬과 공존할 수 없어 clamp가 이긴다 —
					// 잘릴 만큼 넘친 텍스트는 어차피 박스를 가득 채워 세로 정렬이 무의미하다.
					display: '-webkit-box',
					'-webkit-box-orient': 'vertical',
					'-webkit-line-clamp': String(lineClamp),
					overflow: 'hidden',
				}
			: {
					...(fixedBox ? { overflow: 'hidden' } : {}),
					...(justify
						? {
								display: 'flex',
								'flex-direction': 'column',
								'justify-content': justify,
							}
						: {}),
				}),
	}
}

// 자식 배치 전략

// 그리드 셀 라인: 앵커(0-based)가 있으면 명시 배치, 없고 span>1이면 span만, 그 외 생략.
function formatGridLine(anchor: number | undefined, span: number): string | undefined {
	if (anchor != null) return `${anchor + 1} / span ${span}`
	if (span > 1) return `span ${span}`
	return undefined
}

// 셀 내부 정렬: 명시값 우선. AUTO(기본)는 자식 리사이즈를 따른다 — FILL=stretch, 그 외(HUG/FIXED)=start.
function resolveGridSelfAlign(
	align: string | undefined,
	sizing: string | undefined,
): string | undefined {
	if (align && align !== 'AUTO') return SELF_ALIGN[align]
	return sizing === 'FILL' ? 'stretch' : 'start'
}

// FIXED 축은 명시 치수를 준다(HUG는 auto, FILL은 grow/stretch가 처리). flex·grid 자식 공통.
// 회전 노드의 AABB는 회전 결과의 외곽이므로 회전 전 크기(size)를 쓴다 — CSS rotate가 레이아웃 크기를 바꾸지 않아서다.
function createFixedSizeStyle(node: Node): IrCssStyle {
	const b =
		node.rotation && node.size
			? { width: node.size.x, height: node.size.y }
			: node.absoluteBoundingBox
	if (!b) return {}
	return {
		width: node.layoutSizingHorizontal === 'FIXED' ? `${roundCssNumber(b.width)}px` : undefined,
		height: node.layoutSizingVertical === 'FIXED' ? `${roundCssNumber(b.height)}px` : undefined,
	}
}

/** GRID 부모의 자식: 앵커 셀 + span + 셀 내부 정렬 + FIXED 치수. */
function createGridChildStyle(node: Node): IrCssStyle {
	return {
		'grid-column': formatGridLine(node.gridColumnAnchorIndex, node.gridColumnSpan ?? 1),
		'grid-row': formatGridLine(node.gridRowAnchorIndex, node.gridRowSpan ?? 1),
		'justify-self': resolveGridSelfAlign(
			node.gridChildHorizontalAlign,
			node.layoutSizingHorizontal,
		),
		'align-self': resolveGridSelfAlign(node.gridChildVerticalAlign, node.layoutSizingVertical),
		...createFixedSizeStyle(node),
	}
}

/** Auto Layout 부모의 자식: flex-grow(FILL 주축) + align-self + FIXED 치수. */
function createAutoLayoutChildStyle(node: Node): IrCssStyle {
	return {
		'flex-grow': node.layoutGrow ? String(node.layoutGrow) : undefined,
		'align-self': node.layoutAlign ? SELF_ALIGN[node.layoutAlign] : undefined,
		...createFixedSizeStyle(node),
	}
}

type AxisConstraint =
	| NonNullable<Node['constraints']>['horizontal']
	| NonNullable<Node['constraints']>['vertical']

interface ConstraintAxis {
	constraint?: AxisConstraint
	sizing?: Node['layoutSizingHorizontal']
	start: number
	size: number
	parentSize: number
	startProperty: 'left' | 'top'
	endProperty: 'right' | 'bottom'
	sizeProperty: 'width' | 'height'
}

/** px 수치 → CSS 길이 문자열. */
const formatPx = (value: number) => `${roundCssNumber(value)}px`

/** CENTER constraint의 위치: 부모 중심으로부터의 오프셋을 calc(50% ± Npx)로 표현한다. */
function formatCenteredPosition(start: number, parentSize: number): string {
	const offset = roundCssNumber(start - parentSize / 2)
	if (offset === 0) return '50%'
	return `calc(50% ${offset < 0 ? '-' : '+'} ${Math.abs(offset)}px)`
}

/** 한 축의 Figma constraint(MIN/MAX/CENTER/STRETCH/SCALE)를 left·right·width 등 CSS 배치로 옮긴다. */
function createConstraintAxisStyle({
	constraint,
	sizing,
	start,
	size,
	parentSize,
	startProperty,
	endProperty,
	sizeProperty,
}: ConstraintAxis): Record<string, string> {
	const end = parentSize - start - size
	const hug = sizing === 'HUG'

	switch (constraint) {
		case 'RIGHT':
		case 'BOTTOM':
			return hug
				? { [endProperty]: formatPx(end) }
				: { [endProperty]: formatPx(end), [sizeProperty]: formatPx(size) }
		case 'CENTER':
			return {
				[startProperty]: formatCenteredPosition(hug ? start + size / 2 : start, parentSize),
				...(hug ? {} : { [sizeProperty]: formatPx(size) }),
			}
		case 'LEFT_RIGHT':
		case 'TOP_BOTTOM':
			return { [startProperty]: formatPx(start), [endProperty]: formatPx(end) }
		case 'SCALE':
			if (parentSize > 0) {
				return {
					[startProperty]: `${roundCssNumber((start / parentSize) * 100)}%`,
					[sizeProperty]: `${roundCssNumber((size / parentSize) * 100)}%`,
				}
			}
	}

	return hug
		? { [startProperty]: formatPx(start) }
		: { [startProperty]: formatPx(start), [sizeProperty]: formatPx(size) }
}

// 비 Grid/Auto Layout 자식의 Figma Constraints를 부모 기준 CSS 배치로 옮긴다.
function createConstraintChildStyle(
	node: Node,
	parent: Node,
	useAbsoluteBounds: boolean,
): IrCssStyle {
	const pb = parent.absoluteBoundingBox
	const b = node.absoluteBoundingBox
	if (!pb || !b) return {}

	// Figma가 렌더한 SVG는 회전까지 포함한 결과이므로 AABB 크기를 그대로 쓴다.
	const dim = useAbsoluteBounds || !node.size ? b : { width: node.size.x, height: node.size.y }
	// 회전 노드는 회전 전 크기 박스를 AABB 중심에 맞춰 배치한다 — CSS rotate는 중심 기준이라
	// 중심만 맞으면 순수 회전의 최종 위치가 Figma와 일치한다. size가 없으면 AABB 코너 근사(기존 동작).
	const rotationOffset =
		!useAbsoluteBounds && node.rotation && node.size
			? { x: (b.width - node.size.x) / 2, y: (b.height - node.size.y) / 2 }
			: { x: 0, y: 0 }
	const hugCenterX =
		!useAbsoluteBounds &&
		node.layoutSizingHorizontal === 'HUG' &&
		node.constraints?.horizontal === 'CENTER'
	const hugCenterY =
		!useAbsoluteBounds &&
		node.layoutSizingVertical === 'HUG' &&
		node.constraints?.vertical === 'CENTER'
	// CSS absolute는 부모의 padding box(border 안쪽) 기준인데 Figma 좌표는 노드 외곽 기준이라,
	// 부모가 border를 방출하면 그 두께만큼 좌표계를 되돌린다(시작점·부모 크기 모두).
	const insets = findBorderInsets(parent)
	return {
		position: 'absolute',
		...createConstraintAxisStyle({
			constraint: node.constraints?.horizontal,
			sizing: useAbsoluteBounds ? undefined : node.layoutSizingHorizontal,
			start: b.x - pb.x - insets.left + rotationOffset.x,
			size: dim.width,
			parentSize: pb.width - insets.left - insets.right,
			startProperty: 'left',
			endProperty: 'right',
			sizeProperty: 'width',
		}),
		...createConstraintAxisStyle({
			constraint: node.constraints?.vertical,
			sizing: useAbsoluteBounds ? undefined : node.layoutSizingVertical,
			start: b.y - pb.y - insets.top + rotationOffset.y,
			size: dim.height,
			parentSize: pb.height - insets.top - insets.bottom,
			startProperty: 'top',
			endProperty: 'bottom',
			sizeProperty: 'height',
		}),
		transform:
			hugCenterX && hugCenterY
				? 'translate(-50%,-50%)'
				: hugCenterX
					? 'translateX(-50%)'
					: hugCenterY
						? 'translateY(-50%)'
						: undefined,
	}
}

// 부모 레이아웃 종류에 따른 자식 배치.
// ponytail: 회전 노드는 좌표를 AABB 코너로 잡아 근사한다(정확히는 relativeTransform 분해 필요). 비회전은 정확.
export function createChildPlacementStyle(
	node: Node,
	parent: Node | null,
	useAbsoluteBounds = false,
): IrCssStyle {
	if (!parent) return {}
	// ABSOLUTE 자식은 부모 레이아웃 모드와 무관하게 constraints로 배치된다.
	if (node.layoutPositioning === 'ABSOLUTE') {
		return createConstraintChildStyle(node, parent, useAbsoluteBounds)
	}
	if (parent.layoutMode === 'GRID') return createGridChildStyle(node)
	if (parent.layoutMode === 'HORIZONTAL' || parent.layoutMode === 'VERTICAL') {
		return createAutoLayoutChildStyle(node)
	}
	return createConstraintChildStyle(node, parent, useAbsoluteBounds)
}
