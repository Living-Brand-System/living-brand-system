import {
	findPublishedTemplate as findPublishedTemplateRecord,
	listPublishedTemplateNavItems as listPublishedTemplateNavItemsRecords,
	listTemplateCategories as listTemplateCategoriesRecords,
	type PublishedTemplateNavItem,
	type TemplateCategoryNavItem,
} from '@/features/template-core/repositories/published-template.payload.repository'

export type { PublishedTemplateNavItem, TemplateCategoryNavItem }

/**
 * template-core가 소유하는 published 템플릿·카테고리 조회 공개 계약.
 * 다른 기능은 template-core의 repository 구현 파일을 직접 import하지 않고 이 Service를 통해 접근한다.
 */
export async function findPublishedTemplate(
	templateSlug: string,
	options?: Parameters<typeof findPublishedTemplateRecord>[1],
) {
	return findPublishedTemplateRecord(templateSlug, options)
}

export async function listPublishedTemplateNavItems(): Promise<PublishedTemplateNavItem[]> {
	return listPublishedTemplateNavItemsRecords()
}

export async function listTemplateCategories(): Promise<TemplateCategoryNavItem[]> {
	return listTemplateCategoriesRecords()
}
