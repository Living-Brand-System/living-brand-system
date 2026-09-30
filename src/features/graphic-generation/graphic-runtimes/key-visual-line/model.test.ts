import { describe, expect, it } from 'vitest'
import { KEY_VISUAL_LINE_DEFAULT_INPUT } from './definition'
import { createKeyVisualLineScene, type KeyVisualLineInput } from './model'

const viewport = { width: 1080, height: 1080 }

function scene(overrides: Partial<KeyVisualLineInput> = {}) {
	return createKeyVisualLineScene({ ...KEY_VISUAL_LINE_DEFAULT_INPUT, ...overrides }, viewport)
}

describe('createKeyVisualLineScene', () => {
	it('경로를 따라 두께가 얇아지고 길이가 길어진다', () => {
		const { segments } = scene()
		const first = segments[0]
		const last = segments[segments.length - 1]
		if (!first || !last) throw new Error('선이 없다')

		expect(first.weight).toBeGreaterThan(last.weight)
		expect(length(first)).toBeLessThan(length(last))
	})

	it('가장 두꺼운 선은 가장 얇은 선의 배율만큼이다 — 가이드라인의 6배 상한이 여기서 지켜진다', () => {
		const { segments } = scene({ weightRatio: 6 })
		const weights = segments.map((segment) => segment.weight)
		expect(Math.max(...weights) / Math.min(...weights)).toBeCloseTo(6, 5)
	})

	it('선 개수만큼 그린다', () => {
		expect(scene({ lineCount: 4 }).segments).toHaveLength(4)
		expect(scene({ lineCount: 24 }).segments).toHaveLength(24)
	})
})

function length(segment: { x1: number; y1: number; x2: number; y2: number }) {
	return Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1)
}
