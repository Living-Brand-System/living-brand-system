import { type FieldHook, ValidationError } from 'payload'
import { hasGuidelineDocumentSlugConflict } from '../services/validate-guideline-document-slug.service'
import { relationshipId } from '../utils/block-text'

/** Guideline 토픽 slug가 같은 챕터 안에서 고유하도록 검증한다. slug는 언어 공통이다. */
export const validateGuidelineDocumentSlug: FieldHook = async ({
	collection,
	data,
	originalDoc,
	req,
	value,
}) => {
	const slug = typeof value === 'string' ? value : originalDoc?.slug
	if (!slug) return value

	const chapter = relationshipId(
		data && Object.hasOwn(data, 'chapter') ? data.chapter : originalDoc?.chapter,
	)
	const currentId = relationshipId(originalDoc?.id)

	// ponytail: Admin의 저빈도 쓰기는 저장 전 조회로 충분하다. 동시 쓰기가 생기면 DB 경로 키를 추가한다.
	const duplicate = await hasGuidelineDocumentSlugConflict(req, {
		slug,
		chapterId: chapter,
		currentId,
	})

	if (duplicate) {
		throw new ValidationError({
			collection: collection?.slug,
			errors: [{ message: '같은 챕터 안에서 이미 사용 중인 slug입니다.', path: 'slug' }],
			req,
		})
	}

	return value
}
