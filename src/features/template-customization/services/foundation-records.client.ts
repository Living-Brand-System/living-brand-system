import {
	type StudioPreviewImage,
	toStudioPreviewImage,
} from '@/modules/studio-controller/controller-definition'

/**
 * 파운데이션(여러 템플릿이 같이 쓰는 브랜드 데이터) 읽기 — 파운데이션 모달이 목록으로 보인다.
 * 권한(`managerManagedAccess` 등)은 서버가 집행한다. 쓰기는 「저장」 즉시 게시다 — 같은 껍데기의 템플릿 데이터 편집과 같다.
 */

export type FoundationColor = {
	id: number
	name: string
	hex: string
	cmyk?: string | null
	pantone?: string | null
	colorGroup?: string | null
	tone?: number | null
	isMain?: boolean | null
	allowsFullColorLogo?: boolean | null
	allowsWhiteWordmark?: boolean | null
	monoLogoFill?: 'black' | 'white' | null
}

export type FoundationColorGroup = {
	id: number
	name: string
	family?: string | null
	colors: { id: number; hex: string }[]
}

export type FoundationLogo = {
	id: number
	name: string
	ciShape?: string | null
	ciVariant?: string | null
	url?: string | null
	alt?: string | null
}

export type FoundationTemplateThumb = { id: number; name: string; image?: StudioPreviewImage }

export type FoundationCategory = {
	id: number
	title: string
	description?: string | null
	displayOrder?: number | null
	templateCount: number
}

async function list<T>(path: string, fallback: string): Promise<T[]> {
	const response = await fetch(path)
	if (!response.ok) throw new Error(fallback)
	return ((await response.json()) as { docs: T[] }).docs
}

export type FoundationCollection =
	| 'brand-colors'
	| 'brand-color-groups'
	| 'brand-logos'
	| 'template-categories'

/** 초안·게시가 있는 컬렉션 — 고치면 바로 게시한다. */
const VERSIONED = new Set<FoundationCollection>([
	'brand-colors',
	'brand-color-groups',
	'brand-logos',
])

/** 한 건을 고쳐 바로 게시한다. 서버 검증(HEX 형식 등)이 거부하면 그 문구로 실패한다. */
export async function updateFoundationRecord(
	collection: FoundationCollection,
	id: number,
	data: Record<string, unknown>,
): Promise<void> {
	const response = await fetch(`/api/${collection}/${id}?depth=0`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(VERSIONED.has(collection) ? { ...data, _status: 'published' } : data),
	})
	if (response.ok) return
	const body = (await response.json().catch(() => null)) as {
		errors?: { message?: string; data?: { errors?: { message?: string }[] } }[]
	} | null
	const first = body?.errors?.[0]
	throw new Error(first?.data?.errors?.[0]?.message ?? first?.message ?? '저장하지 못했어요.')
}

export const listFoundationColors = () =>
	list<FoundationColor>(
		'/api/brand-colors?depth=0&limit=200&sort=colorGroup',
		'컬러를 불러오지 못했어요.',
	)

export async function listFoundationColorGroups(): Promise<FoundationColorGroup[]> {
	const docs = await list<{
		id: number
		name: string
		family?: string | null
		colors?: ({ id: number; hex: string } | number)[] | null
	}>('/api/brand-color-groups?depth=1&limit=100', '컬러 그룹을 불러오지 못했어요.')
	return docs.map(({ colors, ...group }) => ({
		...group,
		colors: (colors ?? []).filter((color) => typeof color === 'object'),
	}))
}

export const listFoundationLogos = () =>
	list<FoundationLogo>('/api/brand-logos?depth=0&limit=200', '로고를 불러오지 못했어요.')

export async function listFoundationCategories(): Promise<FoundationCategory[]> {
	const docs = await list<{
		id: number
		title: string
		description?: string | null
		displayOrder?: number | null
		templates?: { totalDocs?: number } | null
	}>(
		// 템플릿 수는 서버가 센다 — 연결 목록은 기본 10개까지만 와서 길이로 세면 10에서 잘린다.
		'/api/template-categories?depth=0&limit=100&sort=displayOrder&joins[templates][count]=true&joins[templates][limit]=1',
		'템플릿 분류를 불러오지 못했어요.',
	)
	return docs.map(({ templates, ...category }) => ({
		...category,
		templateCount: templates?.totalDocs ?? 0,
	}))
}

/** 분류마다 최근에 고친 템플릿 몇 개 — 분류 카드의 썸네일로 쓴다(사용자 2026-10-15). */
export async function listLatestTemplatesByCategory(
	perCategory: number,
): Promise<Map<number, FoundationTemplateThumb[]>> {
	const docs = await list<{
		id: number
		name: string
		category?: { id: number } | number | null
		previewImage?: unknown
	}>(
		'/api/templates?depth=1&limit=200&sort=-updatedAt&select[name]=true&select[category]=true&select[previewImage]=true',
		'템플릿을 불러오지 못했어요.',
	)
	const byCategory = new Map<number, FoundationTemplateThumb[]>()
	for (const { id, name, category, previewImage } of docs) {
		const categoryId = typeof category === 'object' ? category?.id : category
		if (categoryId == null) continue
		const thumbs = byCategory.get(categoryId) ?? []
		if (thumbs.length < perCategory) {
			thumbs.push({ id, name, image: toStudioPreviewImage(previewImage) })
			byCategory.set(categoryId, thumbs)
		}
	}
	return byCategory
}
