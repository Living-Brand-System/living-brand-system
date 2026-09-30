import { describe, expect, it } from 'vitest'
import type { GuidelineDocument } from '@/payload-types'
import { buildGuidelineSearchText } from './guideline-search-text'

describe('buildGuidelineSearchText', () => {
	it('제목, 경로, 블록 본문과 Rule 요약을 검색문으로 평탄화한다', () => {
		const document = {
			id: 55,
			title: 'Brand Model',
			slug: 'brand-model',
			chapter: { title: 'Design Elements' },
			blocks: [
				{
					id: 'examples',
					blockType: 'section',
					anchor: 'examples',
					title: 'Examples',
					description: {
						root: {
							children: [
								{
									type: 'paragraph',
									children: [{ text: '과도한 피부 보정을 피합니다.' }],
								},
							],
						},
					},
					blocks: [],
				},
			],
		} as unknown as GuidelineDocument

		const searchText = buildGuidelineSearchText(document, [
			{ key: 'imagery-misuse', title: 'Imagery Misuse' },
		])

		expect(searchText).toContain('Design Elements')
		expect(searchText).toContain('과도한 피부 보정을 피합니다.')
		expect(searchText).toContain('imagery-misuse Imagery Misuse')
	})
})
