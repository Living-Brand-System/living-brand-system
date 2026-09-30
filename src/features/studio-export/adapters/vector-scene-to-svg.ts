import type {
	VectorPrimitive,
	VectorSceneArtifact,
} from '@/modules/studio-artifact/studio-artifact'
import { type PrintPpi, pixelsToMillimeters } from '../print-policy'

/**
 * 파일 형식과 무관한 Vector Scene을 SVG 문서로 직렬화한다.
 *
 * 🔴 CSS 클래스도 `<style>`도 쓰지 않고 presentation attribute만 쓴다 — Figma·Illustrator가
 *    개체로 풀어 읽는 것이 그쪽이다. 같은 이유로 `foreignObject`는 만들지 않는다.
 * 🔑 글자는 `<text>`로 남긴다. 받는 쪽에서 문구를 고칠 수 있어야 하고, 서체는 디자인 툴이
 *    로컬 설치본으로 잇는다(아웃라인이 필요하면 별도 옵션이지 기본이 아니다).
 */
export function vectorSceneToSvg(artifact: VectorSceneArtifact, ppi: PrintPpi): string {
	const { background, height, primitives, width } = artifact.source
	const body = primitives
		.map((primitive, index) => serialize(primitive, '  ', `${index}`))
		.join('\n')

	// 🔴 단위 없는 width·height는 뷰어가 pt로 읽는다(72dpi) — A4 판이 874×1237mm로 열렸다.
	//    물리 크기는 mm로 적고 좌표계는 viewBox가 px로 유지한다.
	const widthMm = fixed(pixelsToMillimeters(width, ppi))
	const heightMm = fixed(pixelsToMillimeters(height, ppi))

	// 🔴 바닥색을 선언한 씬만 판 사각형을 갖는다 — 없을 때 흰색을 발명하면 루트 프레임의 사각형과
	//    겹쳐 판 전체 사각형이 두 장이 된다(PDF와 같은 규칙).
	const plate = background
		? `\n  <rect width="${width}" height="${height}" fill="${attribute(background)}" />`
		: ''

	// 🔴 `xmlns:xlink`를 선언하지 않으면 `xlink:href`가 든 문서를 Illustrator가 거부한다.
	return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${width} ${height}">${plate}
${body}
</svg>`
}

/** `path`는 트리에서의 자리(`0-2-1`)다. 클립 id를 여기서 뽑아 같은 장면이 항상 같은 문서가 되게 한다. */
function serialize(primitive: VectorPrimitive, indent: string, path: string): string {
	switch (primitive.kind) {
		case 'line':
			return `${indent}<line x1="${fixed(primitive.x1)}" y1="${fixed(primitive.y1)}" x2="${fixed(primitive.x2)}" y2="${fixed(primitive.y2)}" stroke="${attribute(primitive.stroke)}" stroke-width="${fixed(primitive.strokeWidth)}"${primitive.lineCap ? ` stroke-linecap="${primitive.lineCap}"` : ''}${primitive.dash ? ` stroke-dasharray="${primitive.dash.map(fixed).join(' ')}"` : ''} />`
		case 'circle':
			return `${indent}<circle cx="${fixed(primitive.cx)}" cy="${fixed(primitive.cy)}" r="${fixed(primitive.radius)}" fill="${attribute(primitive.fill)}" />`
		case 'rect':
			// 🔴 `fill`이 없으면 속성을 빼는 게 아니라 `none`을 적는다 — SVG 기본값이 검정이라,
			//    테두리만 있어야 할 프레임이 검은 덩어리로 채워져 아래 내용을 덮었다.
			//    PDF 어댑터는 색이 undefined면 안 칠하므로 원래부터 정상이었다.
			return `${indent}<rect x="${fixed(primitive.x)}" y="${fixed(primitive.y)}" width="${fixed(primitive.width)}" height="${fixed(primitive.height)}"${optional('rx', primitive.radius)} fill="${attribute(primitive.fill ?? 'none')}"${optionalText('stroke', primitive.stroke)}${optional('stroke-width', primitive.strokeWidth)}${optional('opacity', primitive.opacity)} />`
		case 'text':
			return `${indent}<text x="${fixed(primitive.x)}" y="${fixed(primitive.y)}" font-family="${attribute(primitive.fontFamily)}" font-size="${fixed(primitive.fontSize)}"${optionalInt('font-weight', primitive.fontWeight)}${optional('letter-spacing', primitive.letterSpacing)} fill="${attribute(primitive.fill)}"${optionalText('text-anchor', primitive.textAnchor)}${optional('opacity', primitive.opacity)}>${text(primitive.text)}</text>`
		case 'image':
			// 🔴 `href`가 아니라 `xlink:href`다 — SVG 1.1만 읽는 경로(Illustrator)가 `href`를 무시해
			//    **사진이 통째로 안 보인다.** 브라우저는 둘 다 읽으므로 눈으로는 안 잡힌다.
			//    🔑 둘 다 적으면 안 된다 — data URI가 두 번 실려 파일이 그대로 두 배가 된다.
			return `${indent}<image x="${fixed(primitive.x)}" y="${fixed(primitive.y)}" width="${fixed(primitive.width)}" height="${fixed(primitive.height)}" xlink:href="${attribute(primitive.href)}" preserveAspectRatio="${attribute(primitive.preserveAspectRatio ?? 'none')}"${optional('opacity', primitive.opacity)} />`
		case 'path':
			return `${indent}<path d="${attribute(primitive.d)}"${transformOf(primitive.x, primitive.y, primitive.scale)}${optionalText('fill', primitive.fill)}${optionalText('stroke', primitive.stroke)}${optional('stroke-width', primitive.strokeWidth)}${optionalText('fill-rule', primitive.fillRule)}${optional('opacity', primitive.opacity)} />`
		case 'group':
			return serializeGroup(primitive, indent, path)
	}
}

function serializeGroup(
	group: Extract<VectorPrimitive, { kind: 'group' }>,
	indent: string,
	path: string,
): string {
	const children = group.children
		.map((child, index) => serialize(child, `${indent}  `, `${path}-${index}`))
		.filter(Boolean)
		.join('\n')
	const clip = group.clip
	const clipId = clip ? `clip-${path}` : null
	const defs = clip
		? `${indent}  <defs><clipPath id="${clipId}"><rect x="${fixed(clip.x)}" y="${fixed(clip.y)}" width="${fixed(clip.width)}" height="${fixed(clip.height)}" /></clipPath></defs>\n`
		: ''
	const open = `${indent}<g${optionalText('data-name', group.label)}${optionalText('transform', group.transform)}${optional('opacity', group.opacity)}${clipId ? ` clip-path="url(#${clipId})"` : ''}>`
	return `${open}\n${defs}${children}${children ? '\n' : ''}${indent}</g>`
}

/** font-weight처럼 정수여야 하는 속성 — `700.00`은 일부 뷰어가 무시한다. */
function optionalInt(name: string, value: number | undefined): string {
	return value === undefined ? '' : ` ${name}="${Math.round(value)}"`
}

/** path의 원점과 배율은 transform 하나로 나간다 — 둘 다 없으면 속성 자체를 만들지 않는다. */
function transformOf(
	x: number | undefined,
	y: number | undefined,
	scale: number | undefined,
): string {
	const moved = Boolean(x || y)
	const scaled = scale !== undefined && scale !== 1
	if (!moved && !scaled) return ''
	const parts = [
		...(moved ? [`translate(${fixed(x ?? 0)} ${fixed(y ?? 0)})`] : []),
		...(scaled ? [`scale(${fixed(scale)})`] : []),
	]
	return ` transform="${parts.join(' ')}"`
}

function optional(name: string, value: number | undefined): string {
	return value === undefined ? '' : ` ${name}="${fixed(value)}"`
}

function optionalText(name: string, value: string | undefined): string {
	return value === undefined ? '' : ` ${name}="${attribute(value)}"`
}

function fixed(value: number): string {
	return value.toFixed(2)
}

function attribute(value: string): string {
	return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
}

function text(value: string): string {
	return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}
