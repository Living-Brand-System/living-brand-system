import { describe, expect, it } from 'vitest'
import { projectCardBlock } from './projection'

const lexical = (text: string) =>
	({ root: { children: [{ type: 'paragraph', children: [{ text }] }] } }) as never

describe('projectCardBlock', () => {
	it('제목·설명·카드 캡션만 평문에 담고 빈 값은 버린다', () => {
		const { text, evidence } = projectCardBlock(
			{
				title: '데이터 제목',
				description: lexical('블록 설명'),
				cards: [
					{ caption: { title: 'Forward Mark', description: lexical('핵심 상징') } },
					{ caption: { title: '  ' } },
				],
			} as never,
			'overview',
			'한 눈에 보기',
		)

		expect(text).toBe('한 눈에 보기\n블록 설명\nForward Mark\n핵심 상징')
		expect(evidence).toEqual({
			type: 'overview',
			title: '한 눈에 보기',
			description: '블록 설명',
			captions: ['Forward Mark', '핵심 상징'],
		})
	})
})
