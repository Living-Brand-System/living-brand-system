import config from '@payload-config'
import { getPayload } from 'payload'
import { FALLBACK_LOCALE, DEFAULT_LOCALE as LOCALE } from '@/lib/locale'
import type { BrandColor } from '@/payload-types'

/** 다른 경계가 쓰는 브랜드 색의 공통 읽기 모델 — 검수 팔레트·인쇄 잉크·캔버스 강조색이 전부 이 네 필드로 끝난다. */
export type BrandColorRecord = Pick<BrandColor, 'cmyk' | 'colorGroup' | 'hex' | 'name'>

/**
 * published brand-colors 전체. `brand-colors`의 소유자는 guideline이고(docs/06 §2 R3) 다른 경계는
 * `list-brand-colors.service`를 거친다 — 전에는 asset-check·studio-export·template-customization이
 * 각자 저장소를 두어 같은 컬렉션을 네 모양으로 읽었다.
 * 🔑 브랜드 색은 로그인과 무관한 공개 정본이라 접근 제어 없이 읽는다.
 */
export async function findPublishedBrandColors(): Promise<BrandColorRecord[]> {
	const payload = await getPayload({ config })
	const { docs } = await payload.find({
		collection: 'brand-colors',
		depth: 0,
		draft: false,
		fallbackLocale: FALLBACK_LOCALE,
		limit: 500,
		locale: LOCALE,
		overrideAccess: true,
		select: { cmyk: true, colorGroup: true, hex: true, name: true },
		sort: 'colorGroup',
	})
	return docs.map(({ cmyk, colorGroup, hex, name }) => ({ cmyk, colorGroup, hex, name }))
}
