import { describe, expect, it } from 'vitest'
import type { GuidelineDocument } from '@/payload-types'
import { collectGuidelineCheckSources } from './collect-guideline-check-sources'

describe('collectGuidelineCheckSources', () => {
	it('문서 Rule과 섹션 Rule에 서로 다른 evidence snapshot을 붙인다', () => {
		const page = {
			id: 12,
			title: 'Logo usage',
			rules: [{ id: 1, key: 'logo.page', title: 'Page Rule', checker: 1 }],
			sections: [
				{
					id: 'sec',
					blockName: 'Logo examples',
					type: 'section',
					anchor: 'clear-space',
					title: 'Clear space',
					cards: [{ id: 'c', display: [{ id: 'w', blockType: 'logoDisplayWidget' }] }],
					rules: [{ id: 2, key: 'logo.section', title: 'Section Rule', checker: 1 }],
				},
			],
		} as unknown as GuidelineDocument

		const sources = collectGuidelineCheckSources(page)

		expect(sources.map(({ rule, source }) => [rule.key, source.documentId])).toEqual([
			['logo.page', 12],
			['logo.section', 12],
		])
		expect(sources.map(({ blockName }) => blockName)).toEqual([null, 'Clear space'])
		expect(sources[0]?.evidence).toEqual({
			type: 'document',
			blocks: [
				{ type: 'section', captions: [], anchor: 'clear-space', title: 'Clear space' },
			],
		})
		expect(sources[1]?.evidence).toEqual({
			type: 'section',
			captions: [],
			anchor: 'clear-space',
			title: 'Clear space',
		})
		// 섹션 Rule은 자기 섹션 위치를 단다 — 검수 화면이 섹션별로 가르는 데 쓴다.
		expect(sources[1]?.source.section).toEqual({
			anchor: 'clear-space',
			title: 'Clear space',
			order: 0,
		})
	})

	it('제목 없는 섹션 Rule도 섹션 위치를 보존한다', () => {
		const page = {
			id: 12,
			title: 'Logo usage',
			sections: [
				{
					id: 'hero',
					type: 'section',
					cards: [{ id: 'c', display: [{ id: 'w', blockType: 'ciLockupHeroWidget' }] }],
					rules: [{ id: 2, key: 'logo.hero', title: 'Hero Rule', checker: 1 }],
				},
			],
		} as unknown as GuidelineDocument

		const sources = collectGuidelineCheckSources(page)

		expect(sources.map(({ rule, source }) => [rule.key, source.section])).toEqual([
			['logo.hero', { anchor: '', title: '', order: 0 }],
		])
	})

	it('populate되지 않은 Rule 관계(ID)는 실행 대상에서 제외한다', () => {
		const page = {
			id: 12,
			title: 'Logo usage',
			rules: [41, { id: 1, key: 'logo.page', title: 'Page Rule', checker: 1 }],
			sections: [],
		} as unknown as GuidelineDocument

		const sources = collectGuidelineCheckSources(page)

		expect(sources.map(({ rule }) => rule.key)).toEqual(['logo.page'])
	})

	it('문서 Rule에는 참조 자산이 없다 — 헤더 이미지(카드 썸네일)도 leaf의 이미지도 넣지 않는다', () => {
		const image = {
			id: 66,
			name: 'Brand Guideline Reference p.37',
			url: '/api/application-images/file/page-37.jpg',
			mimeType: 'image/jpeg',
		}
		const page = {
			id: 46,
			title: 'Incorrect Usage',
			headerImage: image,
			rules: [
				{ id: 3, key: 'typography.misuse', title: '타이포그래피 오용 금지', checker: 1 },
			],
			sections: [
				{
					id: 's',
					type: 'section',
					title: 'Misuse',
					cards: [{ id: 'c', display: [{ id: 'i', blockType: 'image', image }] }],
				},
			],
		} as unknown as GuidelineDocument

		const sources = collectGuidelineCheckSources(page)

		expect(sources[0]?.referenceAssets).toEqual([])
	})
})
