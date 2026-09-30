import { describe, expect, it } from 'vitest'
import { IMAGE_PROMPT_MAX_LENGTH } from '@/features/image-generation/domain/image-generation-limits'
import type {
	TemplateImageSlot,
	TemplateSlot,
} from '@/features/template-core/domain/collect-template-slots'
import { isEmptyTemplateSessionPatch } from '@/features/template-customization/domain/template-session-patch'
import { toTemplateSessionPatch } from './agent-template-request.service'

const policy = (access: 'editable' | 'readonly') => ({
	access,
	visibility: { defaultVisible: true, allowToggle: false },
})

const textSlot = (
	nodeId: string,
	access: 'editable' | 'readonly' = 'editable',
	input: TemplateSlot['input'] = {},
): TemplateSlot => ({
	nodeId,
	name: nodeId,
	text: '',
	input,
	policy: policy(access),
})

const imageSlot = (
	nodeId: string,
	access: 'editable' | 'readonly' = 'editable',
): TemplateImageSlot => ({
	nodeId,
	name: nodeId,
	transformEnabled: false,
	policy: policy(access),
})

describe('toTemplateSessionPatch', () => {
	it('열린 텍스트 슬롯 값을 원시 nodeId 키로 담는다 — `text:` 접두는 컨트롤 id 공간이다', () => {
		const patch = toTemplateSessionPatch([textSlot('t1')], [], [{ slotId: 't1', text: '제목' }])
		expect(patch.text).toEqual({ t1: '제목' })
		expect(Object.keys(patch.text ?? {})).not.toContain('text:t1')
	})

	it('슬롯 목록에 없는 엔트리는 탈락한다', () => {
		const patch = toTemplateSessionPatch(
			[textSlot('t1')],
			[],
			[{ slotId: '없는-슬롯', text: '값' }],
		)
		expect(isEmptyTemplateSessionPatch(patch)).toBe(true)
	})

	it('🔴 readonly 슬롯은 텍스트·이미지 양쪽 다 탈락한다 — 사이드바를 우회하는 경로다', () => {
		const patch = toTemplateSessionPatch(
			[textSlot('t1', 'readonly')],
			[imageSlot('i1', 'readonly')],
			[
				{ slotId: 't1', text: '잠긴 슬롯' },
				{ slotId: 'i1', imagePrompt: '잠긴 이미지' },
			],
		)
		expect(isEmptyTemplateSessionPatch(patch)).toBe(true)
	})

	it('열린 이미지 슬롯의 imagePrompt가 prompt로 담기고 다른 축은 담기지 않는다', () => {
		const patch = toTemplateSessionPatch(
			[],
			[imageSlot('i1')],
			[{ slotId: 'i1', imagePrompt: '컨테이너선 라인아트' }],
		)
		expect(patch.images).toEqual({ i1: { prompt: '컨테이너선 라인아트' } })
		// 🔴 profileId·imageMode·transform·featureValues는 서버가 정하지 않는다.
		expect(Object.keys(patch.images?.i1 ?? {})).toEqual(['prompt'])
	})

	it('슬롯 스펙으로 자른다 — maxLength·maxLines·이미지 프롬프트 상한', () => {
		const patch = toTemplateSessionPatch(
			[
				textSlot('t1', 'editable', { maxLength: 5 }),
				textSlot('t2', 'editable', { maxLines: 2 }),
			],
			[imageSlot('i1')],
			[
				{ slotId: 't1', text: '일이삼사오육칠' },
				{ slotId: 't2', text: '한\n두\n세' },
				{ slotId: 'i1', imagePrompt: 'ㄱ'.repeat(IMAGE_PROMPT_MAX_LENGTH + 50) },
			],
		)
		expect(patch.text?.t1).toBe('일이삼사오')
		expect(patch.text?.t2).toBe('한\n두')
		expect(patch.images?.i1.prompt).toHaveLength(IMAGE_PROMPT_MAX_LENGTH)
	})

	it('빈 축은 생략한다 — 세션을 빈 패치로 흔들지 않는다', () => {
		const patch = toTemplateSessionPatch([textSlot('t1')], [imageSlot('i1')], [])
		expect(patch).toEqual({})
		expect(isEmptyTemplateSessionPatch(patch)).toBe(true)
	})

	it('공백만 있는 imagePrompt는 담지 않는다 — 빈 프롬프트로 생성을 태우면 안 된다', () => {
		const patch = toTemplateSessionPatch(
			[],
			[imageSlot('i1')],
			[{ slotId: 'i1', imagePrompt: '   ' }],
		)
		expect(isEmptyTemplateSessionPatch(patch)).toBe(true)
	})
})
