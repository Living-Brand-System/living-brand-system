import { describe, expect, it } from 'vitest'
import { exportFileName, numberedExportFileName } from './export-file-name'

describe('image download names', () => {
	it('한글과 KST 생성 시각을 보존하고 금지 문자와 긴 프롬프트를 정리한다', () => {
		const date = new Date('2026-09-10T03:00:00Z')
		expect(exportFileName('제품컷', date, '노란색 / 굴착기:*?')).toBe(
			'제품컷-노란색-굴착기-20260910-120000',
		)
		expect(exportFileName('', date, '?')).toBe('output-20260910-120000')
		expect(exportFileName('제품컷', date, '가'.repeat(100))).toBe(
			`제품컷-${'가'.repeat(48)}-20260910-120000`,
		)
	})
	it('내용 없는 이름과 KST 날짜 경계, 순번을 적용한다', () => {
		expect(exportFileName('행사 포스터', new Date('2026-09-10T16:00:00Z'))).toBe(
			'행사-포스터-20260911-010000',
		)
		expect(numberedExportFileName('제품컷', 0)).toBe('제품컷-01')
	})
})
