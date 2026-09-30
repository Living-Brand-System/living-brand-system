'use client'

import type { VectorPrimitive } from '@/modules/studio-artifact/studio-artifact'

/**
 * 템플릿에 얹힌 SVG 자산(로고·심볼)을 **진짜 도형으로** 펼친다.
 *
 * 🔑 이것이 인쇄용 벡터의 핵심이다. 그대로 두면 로고는 `<image>` 한 장이거나(png로 구워지거나)
 *    CSS 마스크라 판정 불가한 사각형이 된다 — 어느 쪽이든 인쇄물에서 로고가 벡터가 아니게 된다.
 * 🔑 마스크로 얹힌 로고는 원본 색이 **의미가 없다.** 마스크는 모양만 쓰고 색은 `backgroundColor`가
 *    정하기 때문이다. 그래서 `tint`가 있으면 자산의 fill을 전부 무시한다.
 * 🔴 같은 출처만 받는다. 외부 URL은 export stage 계약이 이미 막고 있고, 여기서 다시 열지 않는다.
 */
export type SvgAssetOptions = {
	/** 마스크로 얹힌 자산의 단일 색. 있으면 자산 자신의 fill을 무시한다. */
	tint?: string
	/** CSS `mask-size`/`object-fit` 대응. `contain`은 비율을 지키고 `fill`은 상자를 채운다. */
	fit: 'contain' | 'fill'
	opacity?: number
	label?: string
}

type Box = { x: number; y: number; width: number; height: number }

const cache = new Map<string, Promise<Document | null>>()

/**
 * 🔴 `<style>`이나 class로만 색을 정한 자산은 fill을 못 읽어 **검정 덩어리로** 나간다.
 *    리포의 템플릿 자산은 전부 fill 속성이라 실측 0건이고(2026-08-27), CSS 셀렉터 엔진을 만들지
 *    않았다 — 대신 그런 자산을 만나면 호출부가 경고할 수 있게 알린다.
 */
export function usesStyleSheetFill(document_: Document): boolean {
	const root = document_.querySelector('svg')
	if (!root) return false
	return (
		root.querySelector('style') !== null ||
		[...root.querySelectorAll('[class]')].some((el) => !el.getAttribute('fill'))
	)
}

export async function svgAssetUsesStyleSheetFill(url: string): Promise<boolean> {
	const document_ = await loadSvg(url)
	return document_ ? usesStyleSheetFill(document_) : false
}

export async function svgAssetToPrimitives(
	url: string,
	box: Box,
	options: SvgAssetOptions,
): Promise<VectorPrimitive[] | null> {
	const document_ = await loadSvg(url)
	const root = document_?.querySelector('svg')
	if (!root) return null

	const source = viewBoxOf(root)
	if (!source) return null

	// 상자 안에서 자산을 어떻게 앉힐지. contain은 비율을 지키므로 남는 축을 가운데로 민다.
	const scaleX = box.width / source.width
	const scaleY = box.height / source.height
	const scale = options.fit === 'contain' ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY)
	const offsetX = box.x + (box.width - source.width * scale) / 2
	const offsetY = box.y + (box.height - source.height * scale) / 2

	const shapes = mergeCompoundPaths(collectShapes(root, options.tint))
	if (shapes.length === 0) return null

	return shapes.map(({ d, fill, fillRule }) => ({
		kind: 'path' as const,
		d,
		fill: normalizeCssColor(fill),
		...(fillRule ? { fillRule } : {}),
		scale,
		// viewBox의 원점을 빼서 자산 좌표를 판 좌표로 옮긴다.
		x: offsetX - source.x * scale,
		y: offsetY - source.y * scale,
		...(options.opacity === undefined ? {} : { opacity: options.opacity }),
	}))
}

function loadSvg(url: string): Promise<Document | null> {
	const cached = cache.get(url)
	if (cached) return cached
	const loading = fetch(url, { credentials: 'same-origin' })
		.then((response) => (response.ok ? response.text() : null))
		.then((text) => (text ? new DOMParser().parseFromString(text, 'image/svg+xml') : null))
		.catch(() => null)
	cache.set(url, loading)
	return loading
}

function viewBoxOf(root: SVGSVGElement | Element): Box | null {
	const raw = root.getAttribute('viewBox')
	if (raw) {
		const [x, y, width, height] = raw
			.trim()
			.split(/[\s,]+/)
			.map(Number)
		if (width > 0 && height > 0) return { x, y, width, height }
	}
	const width = Number.parseFloat(root.getAttribute('width') ?? '')
	const height = Number.parseFloat(root.getAttribute('height') ?? '')
	return width > 0 && height > 0 ? { x: 0, y: 0, width, height } : null
}

/**
 * 같은 칠을 쓰는 **연이은** 도형을 하나의 path로 합친다 — Illustrator에서 **컴파운드 패스** 하나가 된다.
 *
 * 🔴 이것 없이는 로고가 SVG의 `<path>` 개수만큼 쪼개진다. 실측(2026-09-10): HD현대 CI SVG는
 *    `<path>` 8개 · subpath 10개 · 전부 `fill="black"`이라 PDF에 칠 연산자가 **8번** 나갔고,
 *    Illustrator에서 패스 8개로 열렸다(사용자 지적: 「CI가 컴파운드 패스가 아니라 다 쪼개져 있음」).
 * 🔴 **연이은 것만** 합친다 — 사이에 다른 색 도형이 있으면 합치는 순간 그 도형이 위아래로 뒤집힌다.
 * 🔴 감김 규칙이 다르면 합치지 않는다. nonzero와 evenodd를 한 path에 섞으면 구멍이 달라진다.
 * 🔑 nonzero에서 합치기는 **겹치지 않는 도형에는 합집합과 같다.** 실측으로 확인했다 —
 *    래스터 3,494,400픽셀 중 113개(0.0032%)만 경계 안티에일리어싱으로 달랐고 구멍은 생기지 않았다
 *    (`.scratch/scripts/merge-check.mjs`). 같은 색 도형이 서로 겹치면서 감김이 반대인 병리적
 *    자산에서는 달라질 수 있다 — 그런 자산은 애초에 원본이 컴파운드 패스였을 것이다.
 */
function mergeCompoundPaths(
	shapes: readonly { d: string; fill: string; fillRule?: 'evenodd' }[],
): { d: string; fill: string; fillRule?: 'evenodd' }[] {
	const merged: { d: string; fill: string; fillRule?: 'evenodd' }[] = []
	for (const shape of shapes) {
		const previous = merged.at(-1)
		if (previous && previous.fill === shape.fill && previous.fillRule === shape.fillRule) {
			previous.d = `${previous.d} ${shape.d}`
			continue
		}
		merged.push({ ...shape })
	}
	return merged
}

/**
 * 도형 태그를 전부 path `d`로 편다.
 * 🔴 `transform` 속성이 붙은 노드는 건너뛴다 — 균등 배율 하나만 표현하는 계약이라 회전·기울임을
 *    실을 자리가 없고, 조용히 무시하면 로고가 어긋난 자리에 찍힌다.
 */
function collectShapes(
	root: Element,
	tint?: string,
): { d: string; fill: string; fillRule?: 'evenodd' }[] {
	const shapes: { d: string; fill: string; fillRule?: 'evenodd' }[] = []

	const visit = (element: Element, inheritedFill: string | null) => {
		if (element.getAttribute('transform')) return
		const own = element.getAttribute('fill')
		const fill = tint ?? (own && own !== 'none' ? own : inheritedFill)

		for (const child of Array.from(element.children)) {
			const d = shapeToPath(child)
			if (d) {
				const childFill = tint ?? child.getAttribute('fill') ?? fill
				// 겹친 윤곽을 구멍으로 읽는 규칙. 안 읽으면 도넛·구멍 있는 로고가 메워진다.
				// nonzero는 기본값이라 실을 필요가 없다.
				const rule = child.getAttribute('fill-rule')
				if (childFill && childFill !== 'none')
					shapes.push({
						d,
						fill: childFill,
						...(rule === 'evenodd' ? { fillRule: 'evenodd' as const } : {}),
					})
				continue
			}
			if (child.tagName === 'g') visit(child, fill)
		}
	}
	visit(root, tint ?? '#000000')

	return shapes
}

function shapeToPath(element: Element): string | null {
	const number = (name: string) => Number.parseFloat(element.getAttribute(name) ?? '0') || 0
	switch (element.tagName) {
		case 'path': {
			const d = element.getAttribute('d')
			// 🔴 pdf-lib의 path 파서는 숫자 구분자를 공백·콤마로만 안다 — 개행이 들어 있으면
			//    `M10\n20`이 좌표 1020 하나로 붙어 인쇄 PDF에서만 도형이 뒤틀린다.
			//    브라우저·Illustrator는 정상 파싱하므로 SVG 미리보기로는 안 잡힌다.
			//    polygon 쪽이 이미 쓰는 처방과 같다.
			return d === null ? null : d.replace(/\s+/g, ' ').trim()
		}
		case 'rect': {
			const [x, y, width, height] = ['x', 'y', 'width', 'height'].map(number)
			return width > 0 && height > 0 ? `M${x} ${y}H${x + width}V${y + height}H${x}Z` : null
		}
		case 'circle': {
			const [cx, cy, r] = ['cx', 'cy', 'r'].map(number)
			return r > 0 ? ellipsePath(cx, cy, r, r) : null
		}
		case 'ellipse': {
			const [cx, cy, rx, ry] = ['cx', 'cy', 'rx', 'ry'].map(number)
			return rx > 0 && ry > 0 ? ellipsePath(cx, cy, rx, ry) : null
		}
		case 'polygon':
		case 'polyline': {
			const points = (element.getAttribute('points') ?? '').trim()
			if (!points) return null
			const closed = element.tagName === 'polygon' ? 'Z' : ''
			return `M${points.replace(/\s*,\s*/g, ' ').replace(/\s+/g, ' ')}${closed}`
		}
		case 'line': {
			const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map(number)
			return `M${x1} ${y1}L${x2} ${y2}`
		}
		default:
			return null
	}
}

/**
 * 🔴 SVG 자산은 `black`·`rgb(...)`·`#abc` 등 CSS 색 문법을 아무거나 쓴다. 씬은 `#rrggbb`만 약속하고
 *    PDF 어댑터도 그것만 읽으므로, 여기서 정규화하지 않으면 **PDF에서 로고가 색 없이 사라진다**
 *    (SVG에서는 멀쩡해 보여서 눈으로는 안 잡힌다).
 * canvas의 `fillStyle`이 CSS 색 문법 전체를 정규화해 준다 — 파서를 새로 쓰지 않는다.
 */
export function normalizeCssColor(value: string): string {
	const context = document.createElement('canvas').getContext('2d')
	if (!context) return value
	context.fillStyle = '#000000'
	context.fillStyle = value
	const normalized = context.fillStyle
	return typeof normalized === 'string' ? normalized : value
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
	return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`
}
