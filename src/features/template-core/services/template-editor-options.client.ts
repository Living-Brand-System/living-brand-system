import type { TemplateVectorAssetCollection } from '@/features/template-core/domain/template-asset-policy'
import type {
	ApplicationImage,
	BrandColor,
	BrandColorGroup,
	BrandColorPair,
	BrandLogo,
} from '@/payload-types'

export type TemplateVectorAsset = (BrandLogo | ApplicationImage) & {
	collection: TemplateVectorAssetCollection
}

const PUBLISHED_QUERY = 'depth=0&limit=100&where[_status][equals]=published&sort=name'

async function requestPublishedDocs<T>(
	path: string,
	signal: AbortSignal,
	query = PUBLISHED_QUERY,
): Promise<T[]> {
	const response = await fetch(`/api/${path}?${query}`, { signal })
	if (!response.ok) throw new Error('Failed to load template editor options')
	const body = (await response.json()) as { docs?: T[] }
	return Array.isArray(body.docs) ? body.docs : []
}

/**
 * 브랜드 컬러 선택지를 읽는다(Admin 템플릿 편집기·스튜디오 공용). Payload REST I/O는 이 client service가 소유한다.
 * 🔴 색 전체가 아니라 **발행된 컬러 그룹에 속한 색**만 돌려준다 — 그룹에 없는 보조색(예: 서체 표본 전경)은
 *    팔레트가 아니다. 순서는 그룹 생성 순서 → 그룹 안 순서이고, 여러 그룹에 든 색은 처음 나온 자리에 한 번만 둔다.
 */
export async function requestPublishedBrandColors(signal: AbortSignal): Promise<BrandColor[]> {
	const groups = await requestPublishedDocs<BrandColorGroup>(
		'brand-color-groups',
		signal,
		'depth=1&limit=100&where[_status][equals]=published&sort=createdAt',
	)
	const seen = new Set<number>()
	return groups.flatMap((group) =>
		(group.colors ?? []).flatMap((color) => {
			if (typeof color === 'number' || color._status !== 'published' || seen.has(color.id))
				return []
			seen.add(color.id)
			return [color]
		}),
	)
}

/**
 * 듀오 컬러 정본을 읽는다. 조합은 색을 참조만 하므로 depth=1로 두 색을 함께 받는다.
 * 순서는 생성 순서다 — 스튜디오 스와치 순서가 곧 admin 목록 순서다.
 */
export function requestPublishedBrandColorPairs(signal: AbortSignal): Promise<BrandColorPair[]> {
	return requestPublishedDocs<BrandColorPair>(
		'brand-color-pairs',
		signal,
		'depth=1&limit=100&where[_status][equals]=published&sort=createdAt',
	)
}

/** Admin 템플릿 벡터 편집기의 허용 자산을 읽는다. Payload REST I/O는 이 client service가 소유한다. */
export async function requestPublishedTemplateVectorAssets(
	signal: AbortSignal,
): Promise<TemplateVectorAsset[]> {
	const [logos, images] = await Promise.all([
		requestPublishedDocs<BrandLogo>('brand-logos', signal),
		requestPublishedDocs<ApplicationImage>('application-images', signal),
	])
	return [
		...logos.map((asset) => ({ ...asset, collection: 'brand-logos' as const })),
		...images.map((asset) => ({ ...asset, collection: 'application-images' as const })),
	]
}
