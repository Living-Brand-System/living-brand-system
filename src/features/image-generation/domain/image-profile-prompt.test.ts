import { describe, expect, it } from 'vitest'
import {
	mergeImageProfilePrompt,
	validateImageProfilePromptRows,
	validateImagePromptNormalizationRows,
} from './image-profile-prompt'

describe('image profile prompt', () => {
	it('유저 원문을 subject로 추가하고 같은 키는 정규화 값이 우선한다', () => {
		expect(
			mergeImageProfilePrompt(
				[
					{ key: 'style', value: 'minimalist editorial\ncosmetic photography' },
					{ key: 'background', value: 'pure solid white' },
				],
				{ background: 'warm gray\r\nsolid', mood: 'organic' },
				'  파란색\n\n세럼병  ',
			),
		).toEqual({
			style: 'minimalist editorial, cosmetic photography',
			background: 'warm gray, solid',
			mood: 'organic',
			subject: '파란색, 세럼병',
		})
	})

	it('테이블 안의 중복 키를 거부한다', () => {
		expect(
			validateImageProfilePromptRows([
				{ key: 'style', value: 'a' },
				{ key: 'style', value: 'b' },
			]),
		).toBe('키는 테이블 안에서 중복될 수 없습니다.')
	})

	it('정규화 값 후보의 중복을 거부한다', () => {
		expect(
			validateImagePromptNormalizationRows([
				{
					key: 'mood',
					candidates: [{ value: 'organic' }, { value: 'organic' }],
				},
			]),
		).toBe('값 후보는 중복될 수 없습니다.')
	})

	it('정규화 행은 비어 있어도 유효하다', () => {
		expect(validateImagePromptNormalizationRows(undefined)).toBe(true)
	})
})
