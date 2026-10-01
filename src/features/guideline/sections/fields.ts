import type { Field } from 'payload'

// 문서/블록은 Rule 정의를 소유하지 않고 rules 컬렉션의 규칙을 참조로 선택한다.
export function guidelineRulesField(): Field {
	return {
		name: 'rules',
		type: 'relationship',
		relationTo: 'rules',
		hasMany: true,
		admin: {
			allowCreate: true,
			allowEdit: true,
			appearance: 'drawer',
			description: '이 문서 단위에 적용할 검수 규칙입니다.',
		},
	}
}

// 제목에서 앵커를 뽑는다. Payload의 slugify는 `[^\w-]+`를 버려 한글 제목이 통째로 사라지므로
// 글자·숫자(\p{L}\p{N})를 남긴다 — `#키-레이아웃`도 프래그먼트로는 문제없이 동작한다.
export const titleToAnchor = (title: string): string =>
	title
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '')

/**
 * 섹션의 URL 앵커. 레지스트리에서 `anchor: true`인 블록에만 붙는다 — 좌측 TOC에 오르는 유일한 종류다.
 *
 * 🔴 localized가 아니다. 로케일마다 앵커가 갈리면 복사된 링크가 언어를 바꾸는 순간 끊긴다.
 * 🔴 required가 아닌 이유: 비우면 훅이 제목에서 채운다. required면 어드민이 저장 전 클라이언트 검증에서
 *    막아 훅까지 오지 못한다.
 * 🔴 이미 값이 있으면 손대지 않는다 — 앵커는 URL 정체성이라 제목을 고칠 때마다 다시 파생되면 밖에서
 *    공유한 `#앵커` 링크가 조용히 끊긴다.
 */
export function anchorField(): Field {
	return {
		name: 'anchor',
		type: 'text',
		hooks: {
			beforeValidate: [
				({ siblingData, value }) => {
					if (typeof value === 'string' && value.trim()) return value
					const title = (siblingData as { title?: unknown } | undefined)?.title
					// locale=all API 쓰기에서는 title이 로케일 객체다 — 그때는 채우지 않고 입력에 맡긴다.
					return typeof title === 'string' ? titleToAnchor(title) || value : value
				},
			],
		},
		admin: {
			description:
				'이 섹션의 URL 앵커입니다(예: key-layout). 비우면 제목에서 자동 생성합니다. 토픽 안에서 유일해야 합니다.',
		},
	}
}
