import { describe, expect, it } from 'vitest'
import { mergeTemplateDefaultOverrides } from './template-default-overrides'

describe('mergeTemplateDefaultOverrides', () => {
	const stored = {
		title: { creator: { access: 'editable' as const }, label: '제목' },
		photo: { imageTransform: { x: 5, y: 5, scale: 2, rotate: 0 } },
	}

	it('바뀐 문구·로고 색·생성 이미지를 저장 기본값에 얹고 admin 설정은 지킨다', () => {
		const result = mergeTemplateDefaultOverrides(
			stored,
			{
				title: { text: '새 제목', color: '#ff0000', visible: false },
				subtitle: { text: '그대로' },
				logo: { vectorColor: '#000000' },
				photo: {
					backgroundImage: '/api/generated-images/file/a.png',
					assetRef: { collection: 'generated-images', id: 7 },
					imageDimmer: 0.4,
				},
			},
			{ title: '옛 제목', subtitle: '그대로' },
		)
		expect(result).toEqual({
			overrides: {
				title: { creator: { access: 'editable' }, label: '제목', text: '새 제목' },
				logo: { vectorColor: '#000000' },
				// 새 이미지면 옛 위치·크기는 지운다.
				photo: { backgroundImage: '/api/generated-images/file/a.png', generatedImageId: 7 },
			},
		})
	})

	it('샘플 이미지는 저장하지 않고 이유를 돌려준다', () => {
		const result = mergeTemplateDefaultOverrides(
			stored,
			{
				photo: {
					backgroundImage: '/api/sample-images/file/b.png',
					assetRef: { collection: 'sample-images', id: 3 },
				},
			},
			{},
		)
		expect(result).toHaveProperty('blocker')
	})
})
