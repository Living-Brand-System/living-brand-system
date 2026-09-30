import { describe, expect, it } from 'vitest'
import { isEmptyTemplateSessionPatch, templateSessionPatchSchema } from './template-session-patch'

describe('templateSessionPatchSchema', () => {
	it('형태만 본다 — 슬롯 id가 실제로 있는지는 세션이 판단한다', () => {
		const parsed = templateSessionPatchSchema.safeParse({
			text: { '없는-슬롯': '값' },
			images: { '없는-슬롯': { profileId: 1 } },
		})
		expect(parsed.success).toBe(true)
	})

	it('null 색을 허용한다 — 저작 색으로 되돌리는 값이다', () => {
		expect(templateSessionPatchSchema.safeParse({ textColor: null }).success).toBe(true)
		expect(templateSessionPatchSchema.safeParse({ background: { color: null } }).success).toBe(
			true,
		)
	})

	it('배경 형식은 선언된 셋만 받는다', () => {
		expect(
			templateSessionPatchSchema.safeParse({ background: { type: 'graphic' } }).success,
		).toBe(true)
		expect(
			templateSessionPatchSchema.safeParse({ background: { type: 'video' } }).success,
		).toBe(false)
	})

	it('디머 강도는 0~1 밖을 거른다 — 세션 범위 밖 값이 모델에서 오는 것을 막는다', () => {
		expect(
			templateSessionPatchSchema.safeParse({ background: { dimmerOpacity: 0.4 } }).success,
		).toBe(true)
		expect(
			templateSessionPatchSchema.safeParse({ background: { dimmerOpacity: 1.5 } }).success,
		).toBe(false)
	})

	it('프로파일 id는 양의 정수만 받는다', () => {
		expect(
			templateSessionPatchSchema.safeParse({ images: { a: { profileId: 0 } } }).success,
		).toBe(false)
		expect(
			templateSessionPatchSchema.safeParse({ images: { a: { profileId: 1.5 } } }).success,
		).toBe(false)
	})

	it('🔴 transform은 담지 않는다 — 세션이 그 값을 검증 없이 통과시킨다', () => {
		const parsed = templateSessionPatchSchema.parse({
			images: { a: { transform: { x: 9999, y: 9999, scale: 99, rotate: 720 } } },
		})
		expect(parsed.images?.a).toEqual({})
	})
})

describe('isEmptyTemplateSessionPatch', () => {
	it('빈 객체와 빈 하위 객체를 모두 비었다고 본다', () => {
		expect(isEmptyTemplateSessionPatch({})).toBe(true)
		expect(isEmptyTemplateSessionPatch({ text: {}, images: {} })).toBe(true)
	})

	it('값이 하나라도 있으면 비지 않았다', () => {
		expect(isEmptyTemplateSessionPatch({ text: { a: '' } })).toBe(false)
		// null은 「저작 색으로 되돌리기」라는 뜻있는 값이다.
		expect(isEmptyTemplateSessionPatch({ textColor: null })).toBe(false)
	})
})
