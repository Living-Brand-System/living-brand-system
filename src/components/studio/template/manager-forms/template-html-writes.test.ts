import { describe, expect, it } from 'vitest'
import { keepSurvivingNodeConfigs } from './template-html-writes'

describe('keepSurvivingNodeConfigs', () => {
	it('새 html에 남은 노드의 설정만 남긴다', () => {
		const html = '<div data-node-id="1:1"><p data-node-id="1:2">a</p></div>'
		const kept = keepSurvivingNodeConfigs(html, {
			'1:2': { label: '남음' },
			'9:9': { label: '사라짐' },
		})
		expect(kept).toEqual({ '1:2': { label: '남음' } })
	})
})
