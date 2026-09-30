import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { resolveCmykIccProfilePath } from '../color-profile.server'
import { pngToCmykTiff } from './png-to-cmyk-tiff.sharp'

const icc = resolveCmykIccProfilePath('cgats21-crpc6')

/** 단색 PNG 한 장. */
async function solid(hex: string) {
	return sharp({ create: { width: 16, height: 16, channels: 3, background: hex } })
		.png()
		.toBuffer()
}

/** TIFF를 다시 읽었을 때의 RGB와 원본 RGB 사이 거리. 색이 얼마나 틀어졌나. */
async function roundTripDistance(hex: string, tiff: Buffer) {
	const raw = await sharp(tiff).raw().toBuffer()
	const source = [
		Number.parseInt(hex.slice(1, 3), 16),
		Number.parseInt(hex.slice(3, 5), 16),
		Number.parseInt(hex.slice(5, 7), 16),
	]
	return Math.hypot(raw[0] - source[0], raw[1] - source[1], raw[2] - source[2])
}

describe('pngToCmykTiff', () => {
	it('CMYK 4채널로 나간다', async () => {
		const tiff = await pngToCmykTiff(await solid('#00ad45'), 300, icc)
		expect(tiff).not.toBeNull()
		const meta = await sharp(tiff as Buffer).metadata()
		expect(meta.space).toBe('cmyk')
		expect(meta.channels).toBe(4)
	})

	/**
	 * 🔴 TIFF는 이제 **살아 있는 유일한 CMYK 경로**다(PDF는 RGB로 나간다). 여기서 색이 틀어지면
	 * 잡을 사람이 없다.
	 *
	 * 무엇을 잠그나 — `toColourspace('cmyk')`를 ICC 변환보다 먼저 부르면 sharp가 자체 변환으로
	 * CMYK를 만들고 ICC가 그것을 **또** 변환한다(이중 변환). 중성 회색이 그 피해를 가장 크게 받아
	 * 올리브/갈색으로 치우친다.
	 *
	 * 실측: `#333333`의 왕복 거리가 지금은 **4**, 이중 변환이면 **43**이다. 10배 차이라
	 * 임계값 15는 넉넉하다.
	 */
	it('중성 회색이 치우치지 않는다 — CMYK를 두 번 통과하면 깨진다', async () => {
		const tiff = await pngToCmykTiff(await solid('#333333'), 300, icc)
		expect(tiff).not.toBeNull()
		expect(await roundTripDistance('#333333', tiff as Buffer)).toBeLessThan(15)
	})
})
