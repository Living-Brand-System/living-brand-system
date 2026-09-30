import { describe, expect, it } from 'vitest'
import type { GuidelineDocument } from '@/payload-types'
import { buildCheckSourceSnapshot } from './build-check-source-snapshot'
import { collectGuidelineCheckSources } from './collect-guideline-check-sources'

const lexical = (text: string) =>
	({ root: { children: [{ type: 'paragraph', children: [{ text }] }] } }) as never

describe('buildCheckSourceSnapshot', () => {
	it('blockId가 있으면 해당 섹션의 evidence만 반환한다', () => {
		const page = {
			title: 'Logo',
			blocks: [
				{
					id: 'target',
					blockType: 'section',
					anchor: 'digital',
					title: 'Digital',
					description: lexical('Use 24 px.'),
					cards: [{ id: 'c', display: [{ id: 'w', blockType: 'iconGridWidget' }] }],
				},
				{ id: 'other', blockType: 'section', title: 'Other', cards: [] },
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

	it('토픽 전체 snapshot은 섹션을 순서대로 합치고 header image만 참조 자산으로 갖는다', () => {
		const topic = {
			title: 'Brand Core',
			headerImage: { id: 3, name: 'Core', alt: 'Core visual' },
			blocks: [
				{
					id: 'hero',
					blockType: 'section',
					cards: [{ id: 'c', display: [{ id: 'w', blockType: 'ciLockupHeroWidget' }] }],
				},
				{
					id: 'sec',
					blockType: 'section',
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
						title: undefined,
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
			referenceAssets: [{ id: 3, role: 'context' }],
		})
	})

	it('존재하지 않는 blockId는 기존 snapshot을 지우지 않도록 null을 반환한다', () => {
		const page = { title: 'Logo', blocks: [] } as unknown as GuidelineDocument
		expect(buildCheckSourceSnapshot(page, 'missing')).toBeNull()
	})

	it('통합 문서로 옮긴 뒤에도 Rule 배치 개수와 evidence를 유지한다', () => {
		const rules = [{ id: 1, key: 'logo-size', title: 'Logo size' }]
		const blocks = [
			{
				id: 'usage',
				blockType: 'section',
				anchor: 'minimum',
				title: 'Minimum',
				description: lexical('Use 24 px.'),
				cards: [],
				rules,
			},
		]
		const legacy = { title: 'Primary Logo', blocks, rules } as unknown as GuidelineDocument
		const unified = { ...legacy, headerImage: null } as never

		const legacySources = collectGuidelineCheckSources(legacy)
		const unifiedSources = collectGuidelineCheckSources(unified)

		expect(unifiedSources).toHaveLength(legacySources.length)
		expect(unifiedSources.map(({ rule, evidence }) => ({ key: rule.key, evidence }))).toEqual(
			legacySources.map(({ rule, evidence }) => ({ key: rule.key, evidence })),
		)
	})
})
