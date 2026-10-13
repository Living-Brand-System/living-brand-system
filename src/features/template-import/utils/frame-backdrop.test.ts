import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import type { FigmaSourceNode } from './figma-ir'
import { findFrameBackdrop, isImageRefUsedBelow, renderFrameBackdrop } from './frame-backdrop'

const red = { type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } }
// hd_lbs_templates 161:84의 실제 값 — 단색 위에 잘라 놓은(STRETCH + imageTransform) 이미지.
const cropped = {
	type: 'IMAGE',
	scaleMode: 'STRETCH',
	imageRef: 'ref',
	imageTransform: [
		[1.2266039848327637, 0, -0.15095026791095734],
		[0, 1.9682302474975586, -0.4838119447231293],
	] as [[number, number, number], [number, number, number]],
}
const frame = (fills: unknown[], children: unknown[] = []) =>
	({
		id: '1:1',
		type: 'FRAME',
		absoluteBoundingBox: { x: 0, y: 0, width: 297, height: 420 },
		fills,
		children,
	}) as FigmaSourceNode

describe('findFrameBackdrop', () => {
	it('단색과 겹친 이미지, 잘라 놓은 이미지는 합성한다', () => {
		expect(findFrameBackdrop(frame([red, cropped]))?.paints).toHaveLength(2)
		expect(findFrameBackdrop(frame([cropped]))?.imageRef).toBe('ref')
	})

	it('이미지 하나만 그대로 깔렸거나, 반복·그라디언트면 합성하지 않는다', () => {
		expect(
			findFrameBackdrop(frame([{ type: 'IMAGE', scaleMode: 'FILL', imageRef: 'ref' }])),
		).toBeNull()
		expect(
			findFrameBackdrop(frame([red, { type: 'IMAGE', scaleMode: 'TILE', imageRef: 'ref' }])),
		).toBeNull()
		expect(findFrameBackdrop(frame([{ type: 'GRADIENT_LINEAR' }, cropped]))).toBeNull()
	})

	it('아래 레이어가 같은 이미지를 쓰는지 안다', () => {
		const child = { id: '1:2', type: 'RECTANGLE', fills: [{ type: 'IMAGE', imageRef: 'ref' }] }
		expect(isImageRefUsedBelow(frame([cropped], [child]), 'ref')).toBe(true)
		expect(isImageRefUsedBelow(frame([cropped]), 'ref')).toBe(false)
	})
})

describe('renderFrameBackdrop', () => {
	it('잘라 놓은 이미지를 Figma와 같은 자리에 단색 위로 굽는다(실측 x 36~279 · y 103~317)', async () => {
		const image = await sharp({
			create: { width: 556, height: 490, channels: 3, background: '#fff' },
		})
			.png()
			.toBuffer()
		const png = await renderFrameBackdrop(frame([red, cropped]), [red, cropped], image)
		const { data, info } = await sharp(png)
			.removeAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true })

		let [x0, x1, y0, y1] = [info.width, -1, info.height, -1]
		for (let y = 0; y < info.height; y++)
			for (let x = 0; x < info.width; x++) {
				if (data[(y * info.width + x) * 3 + 1] < 128) continue // 빨강
				;[x0, x1, y0, y1] = [
					Math.min(x0, x),
					Math.max(x1, x),
					Math.min(y0, y),
					Math.max(y1, y),
				]
			}
		const unit = info.width / 297
		expect([x0 / unit, (x1 + 1) / unit, y0 / unit, (y1 + 1) / unit].map(Math.round)).toEqual([
			37, 279, 103, 317,
		])
	})
})
