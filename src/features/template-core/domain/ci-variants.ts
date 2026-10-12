/**
 * CI 색 버전 — 템플릿의 CI 레이어가 고를 수 있는 선택지 전부. 브랜드 로고(brand-logos)의 「CI 색상」이
 * 이 값 중 하나를 갖고, admin·스튜디오는 같은 「CI 모양」의 로고 중 이 순서로 선택지를 낸다.
 * 단색은 칠이 실제 패스에 들어간 파일이어야 한다 — 인쇄 PDF가 그 패스를 그대로 싣는다(mask 금지).
 */
export const CI_VARIANTS = [
	{ value: 'default', label: '기본형' },
	{ value: 'wordmark', label: '워드마크형' },
	{ value: 'mono-black', label: '단색(블랙)' },
	{ value: 'mono-white', label: '단색(화이트)' },
] as const

export type CiVariant = (typeof CI_VARIANTS)[number]['value']

/** 검증 스키마(z.enum)가 쓰는 값 목록. */
export const CI_VARIANT_VALUES = CI_VARIANTS.map(({ value }) => value) as [
	CiVariant,
	...CiVariant[],
]

/** CI 레이어 하나가 바꿔 낄 수 있는 로고 파일 — 같은 「CI 모양」의 색 버전. */
export interface CiVariantOption {
	variant: CiVariant
	id: number
	src: string
}

/** 로고 목록에서 `assetId`와 같은 모양의 색 버전들을 CI_VARIANTS 순서로 고른다. CI가 아니면 빈 배열. */
export function findCiVariantOptions(
	logos: readonly {
		id: number
		url: string
		ciShape?: string | null
		ciVariant?: string | null
	}[],
	assetId: number,
): CiVariantOption[] {
	const shape = logos.find((logo) => logo.id === assetId)?.ciShape
	if (!shape) return []
	return CI_VARIANTS.flatMap(({ value }) => {
		// ponytail: 같은 모양·색이 둘이면 먼저 온 것. 중복을 막아야 하면 컬렉션 검증으로 올린다.
		const logo = logos.find((item) => item.ciShape === shape && item.ciVariant === value)
		return logo ? [{ variant: value, id: logo.id, src: logo.url }] : []
	})
}
