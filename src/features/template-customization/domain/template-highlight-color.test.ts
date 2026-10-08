import { expect, test } from 'vitest'
import { pickTemplateHighlightColor } from './template-highlight-color'

test('HD HERITAGE GREEN의 hex를 고르고, hex 형태가 아니면 CSS에 넣지 않는다', () => {
	expect(
		pickTemplateHighlightColor([
			{ name: 'HD LIGHT BLUE', hex: '#dcf0f5' },
			{ name: 'HD HERITAGE GREEN', hex: '#1d7a4c' },
		]),
	).toBe('#1d7a4c')
	expect(pickTemplateHighlightColor([{ name: 'HD HERITAGE GREEN', hex: 'red;}' }])).toBeNull()
	expect(pickTemplateHighlightColor([])).toBeNull()
})
