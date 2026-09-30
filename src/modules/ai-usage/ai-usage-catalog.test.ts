import { describe, expect, it } from 'vitest'
import {
	AI_USAGE_FEATURES,
	AI_USAGE_STUDIOS,
	aiUsageFeatureLabel,
	aiUsageStudioLabel,
} from './ai-usage-catalog'

describe('ai-usage 카탈로그', () => {
	it('아는 값은 한글 라벨로 바꾼다', () => {
		expect(aiUsageFeatureLabel('image-generation')).toBe('이미지 생성')
		expect(aiUsageStudioLabel('review')).toBe('검수')
	})

	it('스튜디오가 없는 호출은 스튜디오 밖으로 부른다', () => {
		expect(aiUsageStudioLabel(null)).toBe('스튜디오 밖')
	})

	// 🔴 배포보다 데이터가 앞설 수 있다 — 모르는 값에 빈칸을 그리면 사용량이 사라진 것처럼 보인다.
	it('모르는 값은 원문을 그대로 보여준다', () => {
		expect(aiUsageFeatureLabel('video-generation')).toBe('video-generation')
		expect(aiUsageStudioLabel('motion')).toBe('motion')
	})

	it('값이 중복되지 않는다', () => {
		for (const options of [AI_USAGE_FEATURES, AI_USAGE_STUDIOS]) {
			const values = options.map((option) => option.value)
			expect(new Set(values).size).toBe(values.length)
		}
	})
})
