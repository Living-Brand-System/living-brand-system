import { slugField } from 'payload'

/** 영문 소문자·숫자만 남기고 나머지 연속 구간은 하이픈 하나로 — 한글만 있으면 빈 값이다. */
export const toUrlSlug = (value: unknown): string =>
	typeof value === 'string'
		? value
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '')
		: ''

/**
 * 주소로 쓰는 slug — 영문 소문자·숫자·하이픈만 받는다.
 *
 * 🔴 Payload 기본 slugify는 `[^\w-]+`만 버려서 한글 이름이 「-」 같은 주소가 되고, 두 번째 한글 이름부터
 *    고유 인덱스에 걸린다. 복제의 「poster - Copy」도 「poster---copy」가 되어 형식 검증에 걸린다.
 * 🔴 이름에서 낱말이 하나도 안 나오면(한글만) 사람이 직접 넣은 slug를 쓴다. 안 그러면 Payload가 저장마다
 *    이름으로 slug를 다시 만들어 직접 넣은 값을 빈 값으로 덮는다 — 초안 저장은 검증을 건너뛰므로 막을 곳이 없다.
 */
export function urlSlugField({ useAsSlug, localized }: { useAsSlug: string; localized?: boolean }) {
	return slugField({
		useAsSlug,
		required: true,
		...(localized ? { localized } : {}),
		slugify: ({ data, valueToSlugify }) => toUrlSlug(valueToSlugify) || toUrlSlug(data?.slug),
		overrides: (field) => {
			const slug = field.fields.find(
				(candidate) => 'name' in candidate && candidate.name === 'slug',
			)
			if (slug?.type === 'text') {
				slug.validate = (value: unknown) =>
					typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
						? true
						: '영문 소문자·숫자·하이픈만 사용하세요. 예: summer-poster'
			}
			return field
		},
	})
}
