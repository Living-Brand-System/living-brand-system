import { describe, expect, it } from 'vitest'
import type { GuidelineDocument } from '@/payload-types'
import { buildCheckSourceSnapshot } from './build-check-source-snapshot'
import { collectGuidelineCheckSources } from './collect-guideline-check-sources'

describe('buildCheckSourceSnapshot', () => {
	it('blockId가 있으면 해당 섹션의 evidence만 반환한다', () => {
		const page = {
			title: 'Logo',
			sections: [
				{
					id: 'target',
					type: 'section',
					anchor: 'digital',
					title: 'Digital',
					description: 'Use 24 px.',
					cards: [{ id: 'c', display: [{ id: 'w', blockType: 'iconGridWidget' }] }],
				},
				{ id: 'other', type: 'section', title: 'Other', cards: [] },
			],
		} as unknown as GuidelineDocument

		expect(buildCheckSourceSnapshot(page, 'target')).toEqual({
			evidence: {
				type: 'section',
				captions: [],
				anchor: 'digital',
				title: 'Digital',
				description: 'Use 24 px.',
			},
			referenceAssets: [],
		})
	})

	it('토픽 전체 snapshot은 섹션을 순서대로 합치고 헤더 이미지(카드 썸네일)는 참조 자산으로 싣지 않는다', () => {
		const topic = {
			title: 'Brand Core',
			headerImage: { id: 3, name: 'Core', alt: 'Core visual' },
			sections: [
				{
					id: 'hero',
					type: 'section',
					cards: [{ id: 'c', display: [{ id: 'w', blockType: 'ciLockupHeroWidget' }] }],
				},
				{
					id: 'sec',
					type: 'section',
					anchor: 'main-colors',
					title: 'Main colors',
					cards: [],
				},
			],
		} as unknown as GuidelineDocument

		expect(buildCheckSourceSnapshot(topic)).toEqual({
			evidence: {
				type: 'document',
				blocks: [
					{
						type: 'section',
						captions: [],
						anchor: undefined,
						title: '',
						description: undefined,
					},
					{
						type: 'section',
						captions: [],
						anchor: 'main-colors',
						title: 'Main colors',
						description: undefined,
					},
				],
			},
			referenceAssets: [],
		})
	})

	it('존재하지 않는 blockId는 기존 snapshot을 지우지 않도록 null을 반환한다', () => {
		const page = { title: 'Logo', sections: [] } as unknown as GuidelineDocument
		expect(buildCheckSourceSnapshot(page, 'missing')).toBeNull()
	})

	it('문서와 섹션 Rule의 배치와 출처를 보존한다', () => {
		const rules = [{ id: 1, key: 'logo-size', title: 'Logo size' }]
		const document = {
			id: 1,
			rules,
			sections: [
				{
					id: 'usage',
					type: 'section',
					title: 'Minimum',
					anchor: 'minimum',
					description: 'Use 24 px.',
					rules,
				},
			],
		} as unknown as GuidelineDocument
		const sources = collectGuidelineCheckSources(document)
		expect(sources).toHaveLength(2)
		expect(sources[1]).toMatchObject({
			source: { documentId: 1, section: { anchor: 'minimum', title: 'Minimum', order: 0 } },
			evidence: { type: 'section', description: 'Use 24 px.' },
		})
	})
})
