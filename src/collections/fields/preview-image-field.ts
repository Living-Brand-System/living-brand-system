import type { Field } from 'payload'

/**
 * 스튜디오에서 그래픽·이미지 프로파일과 템플릿을 고를 때 카드에 쓸 미리보기 이미지.
 * 🔴 Payload의 `required`는 앱 검증이라 컬럼은 nullable로 남는다 — 기존 행은 그대로 읽히고
 * 다음 어드민 저장에서 이미지를 요구받는다. 대체할 기본 이미지가 없어 백필도 하지 않는다.
 * 템플릿은 `required: false`로 부른다 — 이미지 없이도 만들 수 있다.
 */
export function previewImageField({ required = true }: { required?: boolean } = {}): Field {
	return {
		name: 'previewImage',
		type: 'upload',
		relationTo: 'application-images',
		required,
		label: '미리보기 이미지',
		admin: {
			position: 'sidebar',
			description: '스튜디오에서 이 항목을 고를 때 카드에 표시할 이미지입니다.',
		},
	}
}
