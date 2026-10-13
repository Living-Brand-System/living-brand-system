import sharp from 'sharp'
import type { FigmaPaint, FigmaSourceNode } from './figma-ir'

/**
 * 판 fill 여러 겹(단색 + 이미지)을 **이미지 한 장으로 합성**한다 — bg 레이어가 그 한 장을 쓴다(사용자 결정 2026-10-12).
 * CSS 배경 겹치기로는 잘라 놓은 이미지(imageTransform)를 옮길 수 없어 이미지가 판에 늘어났다.
 */

/** 합성 대상이면 판의 보이는 fill(아래→위)과 그 이미지의 imageRef. 아니면 null(기존 CSS 경로). */
export function findFrameBackdrop(
	root: FigmaSourceNode,
): { imageRef: string; paints: FigmaPaint[] } | null {
	const paints = (root.fills ?? []).filter((paint) => paint.visible !== false)
	const images = paints.filter((paint) => paint.type === 'IMAGE')
	const image = images[0]
	if (images.length !== 1 || !image?.imageRef || image.scaleMode === 'TILE') return null
	// ponytail: 단색·이미지만 합성한다. 그라디언트가 섞이면 기존 CSS 겹치기로 둔다 — 나오면 SVG 그라디언트로 넓힌다.
	if (paints.some((paint) => paint.type !== 'SOLID' && paint.type !== 'IMAGE')) return null
	const transform = image.imageTransform
	if (transform && (transform[0][1] !== 0 || transform[1][0] !== 0)) return null // 회전·기울임은 안 다룬다
	// 이미지 fill 하나뿐이고 잘라 놓지 않았으면 원본 그대로가 낫다(배정·교체가 원본에 걸린다).
	if (paints.length === 1 && !transform) return null
	return { imageRef: image.imageRef, paints }
}

/** 판 아래 다른 레이어도 같은 이미지를 fill로 쓰는가 — 쓰면 원본 fill도 따로 받아 둬야 한다. */
export function isImageRefUsedBelow(root: FigmaSourceNode, imageRef: string): boolean {
	const uses = (node: FigmaSourceNode): boolean =>
		(node.fills ?? []).some((paint) => paint.imageRef === imageRef) ||
		(node.children ?? []).some(uses)
	return (root.children ?? []).some(uses)
}

type Box = { x: number; y: number; width: number; height: number }

/** 판(W×H) 안에서 이미지가 놓이는 상자 — 잘라 놓았으면 행렬, 아니면 맞춤 방식. */
function placeImage(paint: FigmaPaint, W: number, H: number, iw: number, ih: number): Box {
	const t = paint.imageTransform
	if (t) {
		const [sx, , tx] = t[0]
		const [, sy, ty] = t[1]
		return { x: (-tx / sx) * W, y: (-ty / sy) * H, width: W / sx, height: H / sy }
	}
	if (paint.scaleMode === 'STRETCH') return { x: 0, y: 0, width: W, height: H }
	const scale = (paint.scaleMode === 'FIT' ? Math.min : Math.max)(W / iw, H / ih)
	return {
		x: (W - iw * scale) / 2,
		y: (H - ih * scale) / 2,
		width: iw * scale,
		height: ih * scale,
	}
}

const MAX_SIDE = 4096

/** 합성 PNG를 만든다. 해상도는 이미지 원본의 픽셀 밀도를 따른다(긴 변 4096px 상한). */
export async function renderFrameBackdrop(
	root: FigmaSourceNode,
	paints: readonly FigmaPaint[],
	image: Buffer,
): Promise<Buffer> {
	const W = root.absoluteBoundingBox?.width ?? 0
	const H = root.absoluteBoundingBox?.height ?? 0
	// librsvg가 모든 형식을 <image>로 읽지 못하므로 PNG로 맞춘다.
	const png = await sharp(image).png().toBuffer()
	const { width: iw = 1, height: ih = 1 } = await sharp(png).metadata()
	const imagePaint = paints.find((paint) => paint.type === 'IMAGE') as FigmaPaint
	const box = placeImage(imagePaint, W, H, iw, ih)
	const density = Math.min(Math.max(iw / box.width, 1), MAX_SIDE / Math.max(W, H))

	const layers = paints.map((paint) => {
		const opacity = paint.opacity ?? 1
		if (paint.type === 'IMAGE') {
			return `<image href="data:image/png;base64,${png.toString('base64')}" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" preserveAspectRatio="none" opacity="${opacity}"/>`
		}
		const c = paint.color ?? { r: 0, g: 0, b: 0 }
		const rgb = [c.r, c.g, c.b].map((v) => Math.round(v * 255)).join(',')
		return `<rect width="${W}" height="${H}" fill="rgb(${rgb})" fill-opacity="${(c.a ?? 1) * opacity}"/>`
	})
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(W * density)}" height="${Math.round(H * density)}" viewBox="0 0 ${W} ${H}">${layers.join('')}</svg>`
	return sharp(Buffer.from(svg)).png().toBuffer()
}
