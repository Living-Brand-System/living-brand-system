import { describe, expect, it } from 'vitest'
import {
	applyTextSlotDraft,
	cleanSlotText,
	parseSlotCount,
	toTextSlotDraft,
} from './text-slot-draft'

describe('applyTextSlotDraft', () => {
	const config = {
		creator: { access: 'editable' as const },
		label: 'Title',
		text: '안녕',
		input: { maxLength: 10, aiInstruction: '짧게' },
	}

	it('고치지 않으면 같은 설정으로 돌아온다', () => {
		expect(applyTextSlotDraft(config, toTextSlotDraft(config))).toEqual(config)
	})

	it('이름은 레이어 이름 하나다 — 따로 있던 칸 이름은 걷는다', () => {
		const withFieldName = { ...config, input: { ...config.input, label: '이름' } }
		expect(applyTextSlotDraft(withFieldName, toTextSlotDraft(withFieldName)).input).toEqual({
			maxLength: 10,
			aiInstruction: '짧게',
		})
	})

	it('빈 칸은 키를 지우고 자유 형식은 적지 않는다 — 폼에 없는 값(최대 글자·AI 지침)은 그대로 둔다', () => {
		const draft = { ...toTextSlotDraft(config), layerLabel: ' ', text: '', placeholder: ' ' }
		expect(applyTextSlotDraft(config, { ...draft, inputFormat: 'free' })).toEqual({
			creator: { access: 'editable' },
			input: { maxLength: 10, aiInstruction: '짧게' },
		})
	})
})

describe('어드민과 함께 쓰는 칸 규칙', () => {
	it('숫자 칸은 1 이상의 정수만 받는다 — 1.5를 1로 자르지 않는다', () => {
		expect(parseSlotCount('12')).toBe(12)
		expect(parseSlotCount('')).toBeUndefined()
		expect(parseSlotCount('1.5')).toBeNull()
		expect(parseSlotCount('0')).toBeNull()
	})

	it('글자 칸은 앞뒤 공백을 걷고, 공백뿐이면 없음이다', () => {
		expect(cleanSlotText('  영문 이름 ')).toBe('영문 이름')
		expect(cleanSlotText('   ')).toBeUndefined()
	})
})
