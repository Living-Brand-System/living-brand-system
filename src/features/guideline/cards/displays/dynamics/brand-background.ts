import type { BrandColor, BrandColorGroup } from '@/payload-types'

// 배경으로 쓰이는 브랜드 색 하나 + 그 위에 무슨 로고를 올릴 수 있는지.
// logo-on-background와 logo-bg-picker가 같은 판정을 쓰므로 여기 한 곳에 둔다.
//
// 🔴 이 값들은 brand-colors가 소유한다. 위젯이 대비 공식으로 유도하지 않는다 — 규정이라 계산과
//    어긋나는 칸이 있다(`#DCF5D2`는 기본형 가능, 비슷한 밝기의 `#73D75A`는 불가).

export type BrandBackground = {
	id: string
	name: string
	hex: string
	/** CI 기본형(Full Color) 사용 가능 */
	allowsFullColor: boolean
	/** CI WHITE 워드마크 사용 가능 */
	allowsWhiteWordmark: boolean
	/** 단색분리형의 색 */
	monoFill: 'black' | 'white'
}

export function toBrandBackgrounds(group: BrandColorGroup): BrandBackground[] {
	return (group.colors ?? [])
		.filter((c): c is BrandColor => typeof c === 'object' && c !== null)
		.map((c) => ({
			id: String(c.id),
			name: c.name,
			hex: c.hex,
			allowsFullColor: Boolean(c.allowsFullColorLogo),
			allowsWhiteWordmark: Boolean(c.allowsWhiteWordmark),
			// 규정에 값이 없으면 대비로 지어내지 않는다 — 검정을 기본으로 두고 admin에서 채우게 한다.
			monoFill: c.monoLogoFill === 'white' ? 'white' : 'black',
		}))
}
