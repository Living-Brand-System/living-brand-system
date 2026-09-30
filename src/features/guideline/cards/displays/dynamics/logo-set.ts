import type { getPayload } from 'payload'
import type { BrandLogo } from '@/payload-types'

// 한 로고 세트(기본형/WHITE/단색형)의 URL을 푸는 조회. logo-on-background와 color-incorrect-usage가
// 같은 파일명 규약을 쓰므로 여기 한 곳에 둔다.
// 하위 계층(업로드 파일 자체)은 Payload의 brand-logos 컬렉션이 소유한다.

/** 파일명 규약 `{lang}-{orientation}-{color}.svg`. 기준 로고에서 나머지 변형을 찾는 데 쓴다. */
const VARIANTS = ['default', 'white', 'mono'] as const

export type LogoSources = { default: string | null; white: string | null; mono: string | null }

export type LogoRef = number | BrandLogo | null | undefined

/**
 * 기준 로고의 파일명에서 언어·방향을 떼어 같은 세트의 기본형/WHITE/단색형을 찾는다.
 * 기준이 없으면(갤러리) 아무 3조각 파일이나 하나 잡아 그 세트를 쓴다.
 */
export async function resolveLogoSet(
	payload: Awaited<ReturnType<typeof getPayload>>,
	logo: LogoRef,
): Promise<LogoSources> {
	const { docs } = await payload.find({
		collection: 'brand-logos',
		limit: 200,
		depth: 0,
		overrideAccess: true,
	})

	const picked = typeof logo === 'object' && logo ? logo : null
	// `ko-horizontal-default.svg` → ['ko','horizontal','default']. 조각이 3개가 아닌 파일
	// (`-clearSpace` 같은 레이어)은 세트가 아니라 제외한다.
	const parts = (name: string | null | undefined) => (name ?? '').replace('.svg', '').split('-')
	const base = parts(picked?.filename)
	const prefix =
		base.length === 3
			? base.slice(0, 2)
			: parts(docs.find((d) => parts(d.filename).length === 3)?.filename).slice(0, 2)

	const urlOf = (variant: string) => {
		const filename = `${prefix.join('-')}-${variant}.svg`
		const doc = docs.find((d) => d.filename === filename)
		return doc?.url ?? (doc ? `/api/brand-logos/file/${filename}` : null)
	}

	const [fullColor, white, mono] = VARIANTS.map(urlOf)
	return { default: fullColor, white, mono }
}
