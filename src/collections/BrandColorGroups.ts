import type { CollectionConfig } from 'payload'
import { managerManagedAccess } from '@/lib/auth'
import { draftVersions } from './shared'

// 색과 그룹을 분리한다 — 같은 색이 여러 그룹에 속하고(Primary이면서 배경 예시), 팔레트 순서는
// 색이 아니라 그룹이 가진 성질이기 때문이다. 그래서 색에 그룹 이름을 박지 않고 그룹이 색을 참조한다.
export const BrandColorGroups: CollectionConfig = {
	slug: 'brand-color-groups',
	access: managerManagedAccess,
	labels: {
		singular: '컬러 그룹',
		plural: '컬러 그룹',
	},
	admin: {
		group: '브랜드 자원',
		useAsTitle: 'name',
	},
	versions: draftVersions,
	// 그룹 사이의 순서는 생성 순서다. Admin 목록도 같은 순서로 보여야 화면과 어긋나지 않는다
	// (기본값은 최신 우선이라 팔레트가 거꾸로 보인다).
	defaultSort: 'createdAt',
	fields: [
		{
			name: 'name',
			type: 'text',
			required: true,
			localized: true,
			admin: {
				description: '팔레트에 표시할 그룹 이름입니다. 예: Primary Color',
			},
		},
		{
			name: 'family',
			type: 'select',
			label: '팔레트 분류',
			unique: true,
			options: [
				{ label: 'Primary', value: 'primary' },
				{ label: 'Supportive', value: 'supportive' },
				{ label: 'Monotone', value: 'monotone' },
			],
			admin: {
				description:
					'신규 팔레트의 안정적인 분류입니다. Brand는 Primary + Supportive로 자동 조합합니다.',
			},
		},
		// ponytail: 정렬 필드를 두지 않는다. 그룹이 3개뿐이라 생성 순서로 충분하다.
		{
			name: 'colors',
			type: 'relationship',
			relationTo: 'brand-colors',
			hasMany: true,
			admin: {
				description: '선택한 순서대로 팔레트에 표시됩니다. 드래그로 순서를 바꿉니다.',
			},
		},
	],
}
