import { describe, expect, it } from 'vitest'
import { GraphicProfiles } from '../GraphicProfiles'
import { ImageProfiles } from '../ImageProfiles'
import { Templates } from '../Templates'
import { previewImageField } from './preview-image-field'

// 템플릿만 미리보기 없이 만들 수 있다 — 프로파일은 여전히 필수다.
const STUDIO_COLLECTIONS = [
	['graphic-profiles', GraphicProfiles, true],
	['image-profiles', ImageProfiles, true],
	['templates', Templates, false],
] as const

describe('previewImageField', () => {
	it('application-images를 가리키는 필수 upload 필드다', () => {
		expect(previewImageField()).toMatchObject({
			name: 'previewImage',
			type: 'upload',
			relationTo: 'application-images',
			required: true,
		})
	})

	it('그래픽·이미지 프로파일과 템플릿이 같은 계약을 쓰고, 템플릿만 선택이다', () => {
		for (const [slug, collection, required] of STUDIO_COLLECTIONS) {
			const field = collection.fields.find(
				(candidate) => 'name' in candidate && candidate.name === 'previewImage',
			)
			expect(field, slug).toEqual(previewImageField({ required }))
		}
	})
})
