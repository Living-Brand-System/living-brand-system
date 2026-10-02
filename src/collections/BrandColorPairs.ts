import type { CollectionConfig } from 'payload'
import { managerManagedAccess } from '@/lib/auth'
import { draftVersions } from './shared'

// 듀오 컬러(바탕 + 그 위에 올리는 색)의 정본. 색을 hex로 다시 적지 않고 brand-colors를 참조한다 —
// 두 곳에 적으면 단색 정본이 바뀔 때 조합만 옛 값으로 남는다.
export const BrandColorPairs: CollectionConfig = {
	slug: 'brand-color-pairs',
	access: managerManagedAccess,
	labels: {
		singular: '컬러 조합',
		plural: '컬러 조합',
	},
	admin: {
		group: '브랜드 자원',
		useAsTitle: 'name',
		defaultColumns: ['name', 'background', 'foreground', 'updatedAt'],
	},
	versions: draftVersions,
	// ponytail: 정렬 필드를 두지 않는다 — 스튜디오 스와치 순서는 생성 순서다(컬러 그룹과 같은 규칙).
	defaultSort: 'createdAt',
	fields: [
		{
			name: 'name',
			type: 'text',
			required: true,
			localized: true,
			admin: {
				description: '스와치 이름입니다. 예: Deep Green 위 Light Green',
			},
		},
		{
			type: 'row',
			fields: [
				{
					name: 'background',
					type: 'relationship',
					relationTo: 'brand-colors',
					required: true,
					admin: { width: '50%', description: '바탕(면) 색입니다.' },
				},
				{
					name: 'foreground',
					type: 'relationship',
					relationTo: 'brand-colors',
					required: true,
					admin: { width: '50%', description: '바탕 위에 올리는 선·글자 색입니다.' },
				},
			],
		},
	],
}
