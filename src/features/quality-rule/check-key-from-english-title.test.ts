import { describe, expect, it } from 'vitest'
import { checkKeyFromEnglishTitle } from './check-key-from-english-title'

describe('checkKeyFromEnglishTitle', () => {
	it('영문 제목에서 namespace 없는 안정적인 key를 만든다', () => {
		expect(checkKeyFromEnglishTitle('Imagery Mood & Tone')).toBe('imagery-mood-tone')
		expect(checkKeyFromEnglishTitle('  Logo / Clear Space  ')).toBe('logo-clear-space')
	})
})
