import { describe, expect, it } from 'vitest'
import { parseTemplateNodeConfigs } from './parse-template-node-configs'

describe('parseTemplateNodeConfigs imageTransform', () => {
	it('유한수 네 값이 범위 안이면 허용한다', () => {
		const parsed = parseTemplateNodeConfigs({
			'frame-1': { imageTransform: { x: 120, y: -300, scale: 1.5, rotate: -45 } },
		})

		expect('blocker' in parsed).toBe(false)
		if (!('blocker' in parsed)) {
			expect(parsed.data['frame-1']?.imageTransform).toEqual({
				x: 120,
				y: -300,
				scale: 1.5,
				rotate: -45,
			})
		}
	})

	it('imageTransform이 없어도 허용한다', () => {
		const parsed = parseTemplateNodeConfigs({ 'frame-1': { text: 'hi' } })

		expect('blocker' in parsed).toBe(false)
	})

	it.each([
		['숫자가 아닌 값', { x: '1', y: 0, scale: 1, rotate: 0 }],
		['비유한수', { x: Number.NaN, y: 0, scale: 1, rotate: 0 }],
		['scale 0 이하', { x: 0, y: 0, scale: 0, rotate: 0 }],
		['scale 20 초과', { x: 0, y: 0, scale: 21, rotate: 0 }],
		['이동 ±10000 초과', { x: 10001, y: 0, scale: 1, rotate: 0 }],
		['회전 ±360 초과', { x: 0, y: 0, scale: 1, rotate: 361 }],
		['필드 누락', { x: 0, y: 0, scale: 1 }],
		['알 수 없는 필드', { x: 0, y: 0, scale: 1, rotate: 0, skew: 5 }],
	])('%s은 거부한다', (_label, imageTransform) => {
		const parsed = parseTemplateNodeConfigs({ 'frame-1': { imageTransform } })

		expect('blocker' in parsed).toBe(true)
	})
})

describe('parseTemplateNodeConfigs imageColorize', () => {
	it('line·background hex 쌍을 허용한다', () => {
		const imageColorize = { line: '#8FD6B8', background: '#0a3d2e' }
		const parsed = parseTemplateNodeConfigs({ 'frame-1': { imageColorize } })

		expect('blocker' in parsed).toBe(false)
		if (!('blocker' in parsed)) {
			expect(parsed.data['frame-1']?.imageColorize).toEqual(imageColorize)
		}
	})

	it('line만 있는 값을 허용한다 — background 생략 = 배경 투명(선만 칠함)', () => {
		const imageColorize = { line: '#8fd6b8' }
		const parsed = parseTemplateNodeConfigs({ 'frame-1': { imageColorize } })

		expect('blocker' in parsed).toBe(false)
		if (!('blocker' in parsed)) {
			expect(parsed.data['frame-1']?.imageColorize).toEqual(imageColorize)
		}
	})

	it.each([
		['line 누락', { background: '#0a3d2e' }],
		['# 없는 값', { line: '8fd6b8', background: '#0a3d2e' }],
		['8자리 hex', { line: '#8fd6b8ff' }],
		['background가 hex가 아닌 값', { line: '#8fd6b8', background: 'url(x)' }],
		['hex가 아닌 값', { line: '#zzzzzz', background: '#0a3d2e' }],
		['CSS 함수 값', { line: 'url(x)', background: '#0a3d2e' }],
		['알 수 없는 필드', { line: '#8fd6b8', background: '#0a3d2e', alpha: 1 }],
	])('%s은 거부한다', (_label, imageColorize) => {
		const parsed = parseTemplateNodeConfigs({ 'frame-1': { imageColorize } })

		expect('blocker' in parsed).toBe(true)
	})
})

describe('parseTemplateNodeConfigs vectorColor', () => {
	it('6자리 hex를 허용한다', () => {
		const parsed = parseTemplateNodeConfigs({ 'vector-1': { vectorColor: '#8FD6B8' } })

		expect('blocker' in parsed).toBe(false)
	})

	it.each(['8fd6b8', '#abc', '#8fd6b8ff', 'url(x)'])('%s은 거부한다', (vectorColor) => {
		const parsed = parseTemplateNodeConfigs({ 'vector-1': { vectorColor } })

		expect('blocker' in parsed).toBe(true)
	})
})

describe('parseTemplateNodeConfigs imageInput', () => {
	it.each([
		['빈 스펙(개방 선언만)', {}],
		['profileId 고정', { profileId: 3 }],
		// admin 이미지 레이어 편집기가 쓰는 두 키 — 빠지면 저장이 400으로 막힌다.
		['허용 프로파일 범위', { allowedProfileIds: [3, 6] }],
		['변형 끔', { transform: { enabled: false } }],
	] as const)('%s을 허용한다', (_label, imageInput) => {
		const parsed = parseTemplateNodeConfigs({ 'frame-1': { imageInput } })

		expect('blocker' in parsed).toBe(false)
		if (!('blocker' in parsed)) {
			expect(parsed.data['frame-1']?.imageInput).toEqual(imageInput)
		}
	})

	it.each([
		['profileId가 숫자가 아님', { profileId: '3' }],
		['profileId 0 이하', { profileId: 0 }],
		['profileId 소수', { profileId: 1.5 }],
		['알 수 없는 필드', { prompt: '금지' }],
	])('%s은 거부한다', (_label, imageInput) => {
		const parsed = parseTemplateNodeConfigs({ 'frame-1': { imageInput } })

		expect('blocker' in parsed).toBe(true)
	})
})

describe('parseTemplateNodeConfigs creator layer policy', () => {
	it('editable access의 기본 visibility와 Creator 토글 정책을 허용한다', () => {
		const creator = {
			access: 'editable' as const,
			visibility: { defaultVisible: false, allowToggle: true },
		}
		const parsed = parseTemplateNodeConfigs({ 'frame-1': { creator } })

		expect('blocker' in parsed).toBe(false)
		if (!('blocker' in parsed)) expect(parsed.data['frame-1']?.creator).toEqual(creator)
	})

	it.each([
		['readonly visibility', { access: 'readonly', visibility: { defaultVisible: false } }],
		['hidden toggle', { access: 'hidden', visibility: { allowToggle: true } }],
		['unknown access', { access: 'active' }],
	])('%s를 거부한다', (_label, creator) => {
		expect('blocker' in parseTemplateNodeConfigs({ 'frame-1': { creator } })).toBe(true)
	})
})
