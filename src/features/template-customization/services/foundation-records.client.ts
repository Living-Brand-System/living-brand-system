/**
 * 파운데이션(여러 템플릿이 같이 쓰는 브랜드 데이터) 읽기 — 파운데이션 모달이 목록으로 보인다.
 * 권한(`managerManagedAccess` 등)은 서버가 집행한다. 쓰기는 아직 없다(모달은 배치부터, 사용자 2026-10-15).
 */

export type FoundationColor = {
	id: number
	name: string
	hex: string
	cmyk?: string | null
	pantone?: string | null
	colorGroup?: string | null
	isMain?: boolean | null
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
