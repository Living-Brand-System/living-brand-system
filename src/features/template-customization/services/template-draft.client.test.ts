import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	pickKnownSlots,
	readTemplateDraft,
	TEMPLATE_DRAFT_TTL_MS,
	type TemplateDraft,
	writeTemplateDraft,
} from './template-draft.client'

const draft = (overrides: Partial<TemplateDraft> = {}): TemplateDraft => ({
	text: { t1: '안녕' },
	textColor: '#000000',
	vectorColors: { v1: '#00af41' },
	visibility: { i1: false },
	images: {},
	background: {
		type: 'color',
		imageMode: 'preset',
		color: '#ffffff',
		prompt: '',
		generating: false,
		error: null,
		featureValues: {},
		graphicValues: {},
	} as TemplateDraft['background'],
	...overrides,
})

describe('임시 저장', () => {
	beforeEach(() => {
		window.localStorage.clear()
		vi.useRealTimers()
	})

	it('같은 사용자·같은 템플릿이면 돌려준다', () => {
		writeTemplateDraft('7', '12', draft())

		expect(readTemplateDraft('7', '12')?.text).toEqual({ t1: '안녕' })
	})

	// 🔴 공용 PC에서 남의 초안이 내 화면에 뜨면 안 된다.
	it('다른 사용자에게는 주지 않는다', () => {
		writeTemplateDraft('7', '12', draft())

		expect(readTemplateDraft('8', '12')).toBeNull()
	})

	// 「다른 템플릿으로 교체하면 사라짐」 — 자리가 하나뿐이라 덮어써서 성립한다.
	it('다른 템플릿에는 주지 않고, 저장하면 이전 것이 사라진다', () => {
		writeTemplateDraft('7', '12', draft())
		expect(readTemplateDraft('7', '99')).toBeNull()

		writeTemplateDraft('7', '99', draft({ text: { t1: '다른 것' } }))
		expect(readTemplateDraft('7', '12')).toBeNull()
	})

	it('오래된 초안은 없는 것으로 친다', () => {
		writeTemplateDraft('7', '12', draft())
		vi.spyOn(Date, 'now').mockReturnValue(Date.now() + TEMPLATE_DRAFT_TTL_MS + 1)

		expect(readTemplateDraft('7', '12')).toBeNull()
	})

	/**
	 * 🔴 생성 중 상태를 저장하면 새로고침한 화면이 영원히 「생성 중」에 갇힌다 —
	 * 그것을 풀 HTTP 응답은 이미 지나갔다.
	 */
	it('생성 중·오류 상태는 저장하지 않는다', () => {
		writeTemplateDraft(
			'7',
			'12',
			draft({
				background: { ...draft().background, generating: true, error: '실패했어요' },
				images: {
					i1: {
						imageMode: 'preset',
						prompt: '',
						generating: true,
						error: '실패',
						featureValues: {},
					},
				},
			}),
		)

		const restored = readTemplateDraft('7', '12')
		expect(restored?.background.generating).toBe(false)
		expect(restored?.background.error).toBeNull()
		expect(restored?.images.i1?.generating).toBe(false)
	})

	it('손상된 저장값은 없는 것과 같다', () => {
		window.localStorage.setItem('lbs.templateDraft', '{ 망가진')

		expect(readTemplateDraft('7', '12')).toBeNull()
	})
})

describe('pickKnownSlots', () => {
	// 템플릿이 바뀐 뒤 돌아오면 사라진 슬롯의 값이 화면에 없이 상태에만 남는다.
	it('지금 있는 슬롯의 값만 남긴다', () => {
		expect(pickKnownSlots({ a: 1, b: 2 }, ['b', 'c'])).toEqual({ b: 2 })
	})
})
