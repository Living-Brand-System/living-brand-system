import { describe, expect, it } from 'vitest'
import {
	IMAGE_ASPECT_RATIOS,
	IMAGE_OUTPUT_SIZES,
	nearestImageAspectRatio,
	toOpenAIImageSize,
} from './image-size'

describe('nearestImageAspectRatio', () => {
	it.each([
		[911, 492, '16:9'], // ≈1.852
		[1036, 578, '16:9'], // ≈1.792
		[1000, 1050, '1:1'], // 정사각형 근처
		[400, 600, '2:3'], // 정확히 지원 비율
		[5000, 100, '21:9'], // 극단 가로 → 가장 넓은 비율로 수렴
		[100, 5000, '9:16'], // 극단 세로 → 가장 좁은 비율로 수렴
	])('%d×%d → %s', (width, height, expected) => {
		expect(nearestImageAspectRatio(width, height)).toBe(expected)
	})

	it.each([
		[0, 100],
		[100, 0],
		[-10, 100],
		[Number.NaN, 100],
		[100, Number.POSITIVE_INFINITY],
	])('잘못된 입력 %d×%d은 undefined — 호출자가 프로파일 비율로 폴백한다', (width, height) => {
		expect(nearestImageAspectRatio(width, height)).toBeUndefined()
	})
})

describe('toOpenAIImageSize', () => {
	it('모든 출력 계약을 gpt-image-2 크기 제약 안으로 변환한다', () => {
		for (const aspectRatio of IMAGE_ASPECT_RATIOS) {
			for (const imageSize of IMAGE_OUTPUT_SIZES) {
				const [width, height] = toOpenAIImageSize(aspectRatio, imageSize)
					.split('x')
					.map(Number)

				expect(width % 16).toBe(0)
				expect(height % 16).toBe(0)
				expect(Math.max(width, height)).toBeLessThanOrEqual(3840)
				expect(width * height).toBeGreaterThanOrEqual(655_360)
				expect(width * height).toBeLessThanOrEqual(8_294_400)
				expect(Math.max(width, height) / Math.min(width, height)).toBeLessThanOrEqual(3)
			}
		}
	})

	it('16:9 4K를 OpenAI의 대표 4K 크기로 유지한다', () => {
		expect(toOpenAIImageSize('16:9', '4K')).toBe('3840x2160')
	})
})
