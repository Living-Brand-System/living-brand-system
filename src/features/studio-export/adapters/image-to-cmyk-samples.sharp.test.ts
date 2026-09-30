// @vitest-environment node
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { resolveCmykIccProfilePath } from '../color-profile.server'
import { imageToCmykSamples } from './image-to-cmyk-samples.sharp'

const ICC = resolveCmykIccProfilePath('cgats21-crpc6')

async function dataUrl(
	background: string | { alpha: number; b: number; g: number; r: number },
	channels: 3 | 4 = 3,
): Promise<string> {
	const png = await sharp({ create: { background, channels, height: 2, width: 2 } })
		.png()
		.toBuffer()
	return `data:image/png;base64,${png.toString('base64')}`
}

describe('imageToCmykSamples', () => {
	/**
	 * 🔴 이 리포의 모든 CMYK 판단이 이 관례 하나에 얹혀 있다 — `0 = 잉크 없음`. 뒤집히면 흰 종이가
	 * 사방 잉크로 찍히고, 그 사고는 화면에서 보이지 않는다(PDF 안에서만 드러난다). sharp·libvips·
	 * lcms 버전이 올라가며 조용히 바뀔 수 있는 값이라 여기서 잠근다.
	 */
	it('흰색은 잉크 0이다 — 반전 관례가 아니다', async () => {
		const samples = await imageToCmykSamples(await dataUrl('#ffffff'), ICC)

		expect(samples).not.toBeNull()
		expect([...(samples?.cmyk.subarray(0, 4) ?? [])]).toEqual([0, 0, 0, 0])
	})

	it('잉크가 많은 색은 큰 값이다 — 검정이 0에 가깝지 않다', async () => {
		const samples = await imageToCmykSamples(await dataUrl('#000000'), ICC)
		const [c, m, y, k] = [...(samples?.cmyk.subarray(0, 4) ?? [])]

		// 정확한 수치는 프로파일·버전이 갖는다. 방향만 잠근다 — K가 거의 꽉 차야 한다.
		expect(k).toBeGreaterThan(200)
		expect(c + m + y).toBeGreaterThan(300)
	})

	it('4채널 잉크와 픽셀 수가 맞는다', async () => {
		const samples = await imageToCmykSamples(await dataUrl('#00AF41'), ICC)

		expect(samples?.width).toBe(2)
		expect(samples?.height).toBe(2)
		expect(samples?.cmyk.byteLength).toBe(2 * 2 * 4)
		expect(samples?.alpha).toBeUndefined()
	})

	/** 🔑 CMYK JPEG은 알파를 구조적으로 못 담아 예전에는 투명 이미지를 거부했다. 잉크 샘플은 담는다. */
	it('알파를 잉크와 분리해 그대로 돌려준다', async () => {
		const samples = await imageToCmykSamples(
			await dataUrl({ alpha: 0.5, b: 65, g: 175, r: 0 }, 4),
			ICC,
		)

		expect(samples?.alpha?.byteLength).toBe(2 * 2)
		expect(samples?.cmyk.byteLength).toBe(2 * 2 * 4)
		// sharp가 0.5를 128로 옮긴다. 프리멀티플라이가 없으므로 잉크는 알파와 무관하게 남는다.
		expect([...(samples?.alpha ?? [])]).toEqual([128, 128, 128, 128])
		expect(samples?.cmyk.subarray(0, 4).some((byte) => byte > 0)).toBe(true)
	})

	/**
	 * 🔴 알파 채널이 **있다**는 것과 실제로 투명하다는 것은 다르다. sharp의 `composite`는 불투명한
	 * 입력에도 알파를 붙이므로(실측), 채널 유무만 보고 `/SMask`를 만들면 아무것도 가리지 않는
	 * 마스크가 바이트를 25% 늘리고 뷰어를 투명 합성 경로로 보낸다.
	 */
	it('알파가 전부 불투명하면 돌려주지 않는다', async () => {
		const samples = await imageToCmykSamples(
			await dataUrl({ alpha: 1, b: 65, g: 175, r: 0 }, 4),
			ICC,
		)

		expect(samples?.alpha).toBeUndefined()
		expect(samples?.cmyk.byteLength).toBe(2 * 2 * 4)
	})

	it('data URI가 아니면 읽지 않는다', async () => {
		expect(await imageToCmykSamples('/api/media/file/photo.png', ICC)).toBeNull()
	})

	it('픽셀 수와 실제 데이터 길이가 어긋나지 않는다 — 알파 분리가 인덱스를 밀지 않는다', async () => {
		const samples = await imageToCmykSamples(
			await dataUrl({ alpha: 0.4, b: 0, g: 0, r: 255 }, 4),
			ICC,
		)
		const first = [...(samples?.cmyk.subarray(0, 4) ?? [])]
		const last = [...(samples?.cmyk.subarray(12, 16) ?? [])]

		// 단색이므로 첫 픽셀과 마지막 픽셀이 같아야 한다. 인덱싱이 밀리면 여기가 깨진다.
		expect(last).toEqual(first)
	})
})
