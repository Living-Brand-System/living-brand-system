import type { TextField } from 'payload'
import { describe, expect, it } from 'vitest'
import { anchorField } from './fields'

describe('section anchor', () => {
	const field = anchorField() as TextField
	const runHook = (value: unknown, title: unknown) =>
		field.hooks?.beforeValidate?.[0]?.({ siblingData: { title }, value } as never)

	it('비어 있으면 제목에서 앵커를 만든다', () => {
		expect(runHook('', 'Grid System Overview')).toBe('grid-system-overview')
	})

	// 🔴 한글 제목이 통째로 사라지면 앵커가 빈 문자열이 되어 `id=""`가 렌더된다.
	it('한글 제목도 앵커로 남긴다', () => {
		expect(runHook(undefined, '키 레이아웃')).toBe('키-레이아웃')
	})

	// 🔴 URL 정체성이므로 이미 정한 앵커는 제목이 바뀌어도 유지된다.
	it('값이 있으면 덮지 않는다', () => {
		expect(runHook('key-layout', 'Grid System Overview')).toBe('key-layout')
	})
})
