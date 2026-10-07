import type { CollectionConfig } from 'payload'
import { managerManagedAccess } from '@/lib/auth'
import { isValidHex } from '@/lib/color'
import { draftVersions } from './shared'

export const BrandColors: CollectionConfig = {
	slug: 'brand-colors',
	access: managerManagedAccess,
	labels: {
		singular: '컬러',
		plural: '컬러',
	},
	admin: {
		group: '브랜드 자원',
		useAsTitle: 'name',
		defaultColumns: ['name', 'hex', 'colorGroup', 'tone', 'updatedAt'],
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
			name: 'hex',
			type: 'text',
			required: true,
			validate: (value: string | null | undefined) =>
				// 🔴 `#`을 필수로 받는다 — 인쇄 잉크 표가 원문을 키로 써서 `#` 없는 값은 정본 CMYK를 못 찾는다.
				typeof value === 'string' && value.startsWith('#') && isValidHex(value)
					? true
					: '6자리 HEX 컬러를 입력하세요. 예: #RRGGBB',
			admin: {
				components: {
					Cell: '/components/admin/brand-colors/color-swatch-cell#ColorSwatchCell',
				},
			},
		},
		{
			name: 'pantone',
			type: 'text',
			admin: {
				description: 'PMS 표기입니다. 예: 705C, Warm Red C',
			},
		},
		// RGB는 저장하지 않는다 — hex에서 무손실로 나오므로 두 곳에 적으면 어긋나기만 한다.
		// CMYK는 장치 의존이라 hex에서 계산되지 않는다. 브랜드팀이 지정한 값만 여기 담는다.
		{
			name: 'cmyk',
			type: 'text',
			admin: {
				description: '인쇄 CMYK 표기입니다. 예: C 0 M 100 Y 90 K 0',
			},
		},
		// 이 색을 배경으로 썼을 때 어떤 로고를 올릴 수 있는가 — 브랜드 가이드라인 규정이지
		// 계산으로 나오는 값이 아니다(대비 공식으로 유도하면 규정과 어긋나는 칸이 생긴다).
		// 그래서 코드가 아니라 여기 담는다. 브랜드팀이 admin에서 고칠 수 있어야 하는 값이다.
		{
			type: 'row',
			fields: [
				{
					name: 'allowsFullColorLogo',
					type: 'checkbox',
					defaultValue: false,
					admin: {
						width: '50%',
						description:
							'이 배경 위에 CI 기본형(Full Color)을 쓸 수 있는지 여부입니다.',
					},
				},
				{
					name: 'allowsWhiteWordmark',
					type: 'checkbox',
					defaultValue: false,
					admin: {
						width: '50%',
						description: '이 배경 위에 CI WHITE 워드마크를 쓸 수 있는지 여부입니다.',
					},
				},
			],
		},
		{
			name: 'monoLogoFill',
			type: 'select',
			enumName: 'enum_brand_colors_mono_logo_fill',
			options: [
				{ label: '검정', value: 'black' },
				{ label: '흰색', value: 'white' },
			],
			admin: {
				description:
					'이 배경 위에 올리는 CI 단색분리형의 색입니다. 단색형은 모든 배경에서 쓸 수 있고 색만 갈립니다.',
			},
		},
		{
			name: 'colorGroup',
			type: 'text',
			admin: {
				description: '팔레트 색상군입니다. 예: red, yellow, neutral',
			},
		},
		{
			name: 'tone',
			type: 'number',
			min: 1,
			max: 5,
			admin: {
				description:
					'Light(1)~Dark(5) 명도 단계입니다. 톤 스펙트럼이 없는 컬러는 비워둡니다.',
			},
		},
		{
			name: 'isMain',
			type: 'checkbox',
			defaultValue: false,
			admin: {
				description: 'Main Color 팔레트에 포함되는 컬러인지 여부입니다.',
			},
		},
	],
}
