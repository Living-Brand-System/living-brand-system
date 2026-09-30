import config from '@payload-config'
import { getPayload } from 'payload'
import { FALLBACK_LOCALE, DEFAULT_LOCALE as LOCALE } from '@/lib/locale'

/** 검수 팔레트를 만드는 데 필요한 브랜드 색의 최소 계약. 분류는 호출자가 한다. */
export type BrandColorRow = {
	name: string
	hex: string
	colorGroup: unknown
}

/**
 * published brand-colors를 조회한다.
 *
 * 🔴 이 조회는 service 안에 있었다(2026-09-02까지). 그러면 호출자가 mock할 수 없어 단위 테스트가
 *    Payload를 실제로 부팅한다 — `getTemplateStudio`가 같은 이유로 CI를 타임아웃으로 죽였다.
 *    Payload 접근은 repository가 갖는다(`docs/06`).
 */
export async function listBrandColors(): Promise<BrandColorRow[]> {
	const payload = await getPayload({ config })
	const colors = await payload.find({
		collection: 'brand-colors',
		depth: 0,
		sort: 'colorGroup',
		limit: 100,
		locale: LOCALE,
		fallbackLocale: FALLBACK_LOCALE,
		draft: false,
		select: {
			name: true,
			hex: true,
			colorGroup: true,
		},
	})

	return colors.docs.map((color) => ({
		name: color.name,
		hex: color.hex,
		colorGroup: color.colorGroup,
	}))
}
