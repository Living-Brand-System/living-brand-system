import { describe, expect, it } from 'vitest'
import { formatCheckEvidence } from './format-check-evidence'

describe('formatCheckEvidence', () => {
	it('구조화된 문서 evidence를 기존 평문 소비자용으로 변환한다', () => {
		expect(
			formatCheckEvidence({
				type: 'document',
				description: 'Logo usage',
				blocks: [
					{
						type: 'section',
						anchor: 'minimum-size',
						title: 'Minimum size',
						description: 'Use at least 24 px.',
					},
				],
			}),
		).toBe('Logo usage\n\nMinimum size\n\nUse at least 24 px.')
	})

	it('동결 스냅샷의 섹션 근거가 블록 층의 blocks를 갖고 있으면 함께 읽는다', () => {
		expect(
			formatCheckEvidence({
				type: 'section',
				title: 'Minimum size',
				blocks: [{ type: 'block', childCount: 2 }],
			} as never),
		).toBe('Minimum size\n\nleaf 2개를 담은 블록')
	})

	it('기존 CheckSession의 문자열 evidence를 그대로 유지한다', () => {
		expect(formatCheckEvidence('legacy evidence')).toBe('legacy evidence')
	})

	it('동결 스냅샷의 삭제된 콘텐츠 열(개명 전 columnUnit 포함) 근거를 그대로 읽는다', () => {
		expect(
			formatCheckEvidence({
				type: 'columnUnit',
				columns: [{ heading: 'Clear space', body: 'Keep 1x margin.' }],
			} as never),
		).toBe('Clear space\nKeep 1x margin.')
	})

	it('동결 스냅샷의 삭제된 콜아웃(개명 전 policyCallout 포함) 근거를 그대로 읽는다', () => {
		expect(
			formatCheckEvidence({
				type: 'policyCallout',
				kind: 'must',
				title: '필수',
				items: ['Keep clear space.'],
			} as never),
		).toBe('필수\n- Keep clear space.')
	})
})
