import { describe, expect, it } from 'vitest'
import { keepPublishedOnRestore } from './shared'

const run = (context: Record<string, unknown>, originalStatus: string, dataStatus: string) =>
	// biome-ignore lint/suspicious/noExplicitAny: 훅 인자 중 판정에 쓰는 세 개만 넘긴다
	(keepPublishedOnRestore as any)({
		context,
		data: { _status: dataStatus },
		originalDoc: { _status: originalStatus },
	})._status

describe('keepPublishedOnRestore', () => {
	it('발행 중인 문서에 초안 버전을 복원해도 발행을 유지한다', () => {
		expect(run({ isRestoringVersion: true }, 'published', 'draft')).toBe('published')
	})

	it('복원이 아닌 저장(발행 해제 포함)은 건드리지 않는다', () => {
		expect(run({}, 'published', 'draft')).toBe('draft')
	})

	it('초안 문서의 복원은 버전 상태를 그대로 따른다', () => {
		expect(run({ isRestoringVersion: true }, 'draft', 'draft')).toBe('draft')
	})
})
