import { describe, expect, it } from 'vitest'
import {
	estimateDataUrlBytes,
	fitWithin,
	MAX_IMAGE_ATTACHMENT_BYTES,
	needsImageCompression,
	prepareAgentChatFiles,
} from './compress-image-attachments'

describe('fitWithin', () => {
	it('긴 변을 maxEdge에 맞추고 비율을 유지한다', () => {
		expect(fitWithin(4000, 2000, 2048)).toEqual({ width: 2048, height: 1024 })
		expect(fitWithin(2000, 4000, 2048)).toEqual({ width: 1024, height: 2048 })
	})

	it('한도 안의 이미지는 확대하지 않는다', () => {
		expect(fitWithin(800, 600, 2048)).toEqual({ width: 800, height: 600 })
	})
})

describe('needsImageCompression', () => {
	it('한도를 넘는 래스터 이미지만 고른다', () => {
		const over = MAX_IMAGE_ATTACHMENT_BYTES + 1
		expect(needsImageCompression({ size: over, type: 'image/png' })).toBe(true)
		expect(needsImageCompression({ size: 1000, type: 'image/png' })).toBe(false)
		expect(needsImageCompression({ size: over, type: 'image/svg+xml' })).toBe(false)
		expect(needsImageCompression({ size: over, type: 'text/plain' })).toBe(false)
	})
})

describe('estimateDataUrlBytes', () => {
	it('base64 payload의 디코딩 크기를 어림한다', () => {
		// 'AAAA' = 3바이트
		expect(estimateDataUrlBytes('data:image/jpeg;base64,AAAA')).toBe(3)
	})
})

describe('prepareAgentChatFiles', () => {
	it('await 사이에 input이 비워져도(살아 있는 FileList) 첨부를 잃지 않는다', async () => {
		const file = new File(['x'], 'a.webp', { type: 'image/webp' })
		// FileList.prototype의 length는 getter뿐이라 자기 속성으로 덮어 가짜를 만든다.
		const live = Object.create(FileList.prototype, {
			0: { value: file, writable: true, configurable: true },
			length: { value: 1, writable: true },
		})

		const pending = prepareAgentChatFiles(live)
		// input.value = '' 가 같은 FileList 객체를 0개로 만드는 브라우저 동작을 재현한다.
		delete live[0]
		live.length = 0

		expect(await pending).toEqual([
			expect.objectContaining({ type: 'file', mediaType: 'image/webp', filename: 'a.webp' }),
		])
	})
})
