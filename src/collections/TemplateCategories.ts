import type { CollectionConfig } from 'payload'
import { assertTemplateCategoryDeletable } from '@/features/template-core/services/guard-template-references.service'
import { managerManagedAccess } from '@/lib/auth'
import { urlSlugField } from './fields/url-slug-field'

/**
 * Create 화면 사이드바의 템플릿 분류 단위.
 * Templates가 category를 참조한다.
 */
export const TemplateCategories: CollectionConfig = {
	slug: 'template-categories',
	dbName: 'template_categories',
	labels: {
		singular: '템플릿 분류',
		plural: '템플릿 분류',
	},
	access: managerManagedAccess,
	hooks: {
		// category는 Templates에서 required — 참조 템플릿이 있으면 삭제 대신 분류 변경을 안내한다.
		beforeDelete: [({ id, req }) => assertTemplateCategoryDeletable(req, Number(id))],
	},
	admin: {
		group: '제작 도구',
		useAsTitle: 'title',
		defaultColumns: ['title', 'slug', 'displayOrder', 'updatedAt'],
		description: 'Create 화면 사이드바에 표시할 템플릿 카테고리입니다.',
	},
	defaultSort: 'displayOrder',
	fields: [
		{
			name: 'title',
			type: 'text',
			required: true,
			localized: true,
			admin: {
				description: '사이드바 카테고리 제목으로 표시됩니다.',
			},
		},
		urlSlugField({ useAsSlug: 'title', localized: true }),
		{
			name: 'description',
			type: 'textarea',
			localized: true,
			admin: {
				description: 'Create 화면에서 카테고리를 설명하는 짧은 문구입니다. (선택)',
			},
		},
		{
			name: 'templates',
			type: 'join',
			collection: 'templates',
			on: 'category',
		},
		{
			name: 'displayOrder',
			type: 'number',
			required: true,
			defaultValue: 0,
			min: 0,
			admin: {
				position: 'sidebar',
				description: '숫자가 낮을수록 사이드바에서 먼저 표시됩니다.',
			},
		},
	],
}
