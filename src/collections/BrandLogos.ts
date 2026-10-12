import type { CollectionConfig } from 'payload'
import { CI_VARIANTS } from '@/features/template-core/domain/ci-variants'
import { templateAssetReferenceGuardHooks } from '@/features/template-core/services/guard-template-references.service'
import { isManager, managerOrAdmin } from '@/lib/auth'
import { draftVersions } from './shared'

export const BrandLogos: CollectionConfig = {
	slug: 'brand-logos',
	labels: {
		singular: '로고',
		plural: '로고',
	},
	// 발행 템플릿이 파일 URL을 참조 중이면 삭제·발행 해제를 거부한다.
	hooks: templateAssetReferenceGuardHooks('brand-logos'),
	access: {
		// 공개 화면은 발행본만 읽고, manager/admin은 Admin에서 draft까지 관리한다.
		read: ({ req }) =>
			isManager(req.user) || {
				_status: { equals: 'published' },
			},
		create: managerOrAdmin,
		update: managerOrAdmin,
		delete: managerOrAdmin,
	},
	admin: {
		group: '브랜드 자원',
		useAsTitle: 'name',
		defaultColumns: ['filename', 'name', 'ciShape', 'ciVariant', 'updatedAt'],
	},
	versions: draftVersions,
	fields: [
		{
			name: 'name',
			type: 'text',
			required: true,
			localized: true,
		},
		{
			name: 'alt',
			type: 'text',
			required: true,
			localized: true,
		},
		// 템플릿 CI 레이어의 색 바꾸기 — 같은 모양끼리 색 버전을 묶는다. 둘 다 비면 CI 선택지에 안 나온다.
		{
			name: 'ciShape',
			label: 'CI 모양',
			type: 'text',
			admin: {
				description: '같은 로고의 색 버전끼리 같은 값을 적습니다(예: hd-horizontal).',
			},
		},
		{
			name: 'ciVariant',
			label: 'CI 색상',
			type: 'select',
			options: CI_VARIANTS.map(({ value, label }) => ({ value, label })),
		},
	],
	upload: {
		imageSizes: [
			{
				name: 'thumbnail',
				width: 320,
				height: 240,
				fit: 'contain',
			},
		],
		adminThumbnail: 'thumbnail',
		mimeTypes: ['image/*'],
	},
}
