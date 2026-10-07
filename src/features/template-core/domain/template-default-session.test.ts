import { describe, expect, it } from 'vitest'
import { findTemplateDefaultSessionBlocker } from './template-default-session'

describe('findTemplateDefaultSessionBlocker', () => {
	it('내부 에셋 이미지만 담긴 화면 상태는 통과시킨다', () => {
		expect(
			findTemplateDefaultSessionBlocker({
				text: { a: '제목' },
				images: {
					b: {
						image: {
							kind: 'sample',
							url: '/api/sample-images/file/a.png',
							thumbnailUrl: '/api/sample-images/file/a-300x300.webp',
						},
					},
				},
				background: { type: 'graphic', graphicConfigId: 'key-visual-formation' },
			}),
		).toBeNull()
		expect(findTemplateDefaultSessionBlocker(null)).toBeNull()
	})

	it('외부 주소 이미지나 객체가 아닌 값은 막는다', () => {
		expect(
			findTemplateDefaultSessionBlocker({
				background: { image: { url: 'https://evil.example/a.png' } },
			}),
		).not.toBeNull()
		expect(findTemplateDefaultSessionBlocker('x')).not.toBeNull()
	})
})
