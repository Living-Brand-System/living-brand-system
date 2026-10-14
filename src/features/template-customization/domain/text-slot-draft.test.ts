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
		label: '제목',
		text: '안녕',
		input: { label: '이름', maxLength: 10, aiInstruction: '짧게' },
	}

	it('고치지 않으면 같은 설정으로 돌아온다', () => {
		expect(applyTextSlotDraft(config, toTextSlotDraft(config))).toEqual(config)
	})

	it('빈 칸은 키를 지우고 자유 형식은 적지 않는다', () => {
		const draft = { ...toTextSlotDraft(config), layerLabel: '', text: '', label: '' }
		expect(
			applyTextSlotDraft(config, { ...draft, maxLength: '', inputFormat: 'free' }),
		).toEqual({
			creator: { access: 'editable' },
			input: { aiInstruction: '짧게' },
		})
	})

	it('공백뿐인 이름·안내·지침은 빈 칸으로 친다', () => {
		const draft = {
			...toTextSlotDraft(config),
			layerLabel: ' ',
			label: '  ',
			placeholder: ' ',
			aiInstruction: ' ',
		}
		const next = applyTextSlotDraft(config, draft)
		expect(next?.label).toBeUndefined()
		expect(next?.input).toEqual({ maxLength: 10 })
	})

	it('숫자 칸이 1 이상의 정수가 아니면 저장하지 않는다', () => {
		for (const maxLines of ['0', '-1', '1.5', 'abc']) {
			expect(applyTextSlotDraft(config, { ...toTextSlotDraft(config), maxLines })).toBeNull()
		}
		expect(
			applyTextSlotDraft(config, { ...toTextSlotDraft(config), maxLines: ' 2 ' })?.input,
		).toMatchObject({ maxLines: 2 })
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
