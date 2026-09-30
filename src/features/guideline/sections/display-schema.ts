import type { Field, RelationshipFieldValidation } from 'payload'
import { relationship } from 'payload/shared'
import { LANGUAGES, WEIGHTS } from '../cards/displays/dynamics/brand-typeface'
import { GUTTER_X, GUTTER_Y, MARGIN } from '../cards/displays/dynamics/layout-grid/manifest'
import { SAMPLE_OPTIONS } from '../cards/displays/dynamics/layout-grid/samples'
import { PALETTES } from '../domain/contract/palette'

export const ASSET_SOURCES = ['application-images', 'brand-icons', 'brand-logos'] as const

const visibleFor =
	(...types: string[]) =>
	(_: unknown, sibling: Record<string, unknown>) =>
		types.includes(String(sibling?.type))

function requiredFor(...types: string[]): RelationshipFieldValidation {
	return (value, args) =>
		relationship(value, {
			...args,
			required: types.includes((args.siblingData as { type: string })?.type),
		})
}

function asset(name: string, label: string, types: string[]): Field {
	return {
		name,
		label,
		type: 'relationship',
		relationTo: [...ASSET_SOURCES],
		admin: { condition: visibleFor(...types) },
		validate: requiredFor(...types),
	}
}

export const displayField: Field = {
	name: 'display',
	type: 'group',
	label: '디스플레이',
	fields: [
		{
			name: 'type',
			type: 'select',
			required: true,
			defaultValue: 'image',
			options: [
				{ label: '이미지', value: 'image' },
				{ label: '가이드 On / Off', value: 'guide' },
				{ label: 'Layout Grid', value: 'layout-grid' },
				{ label: 'Layout Overlay', value: 'layout-overlay' },
				{ label: '서체 굵기', value: 'type-weight' },
				{ label: '팔레트', value: 'palette' },
				{ label: '단독 스와치', value: 'swatch' },
				{ label: '로고 배경색 선택', value: 'logo-background' },
			],
		},
		asset('image', '이미지', ['image', 'guide']),
		{
			name: 'alt',
			type: 'text',
			localized: true,
			label: '대체 텍스트',
			admin: {
				condition: visibleFor('image', 'guide'),
				description: '비우면 에셋의 대체 텍스트 또는 이름을 사용합니다.',
			},
		},
		{
			name: 'fit',
			type: 'select',
			defaultValue: 'contain',
			options: ['contain', 'cover'],
			admin: { condition: visibleFor('image') },
		},
		{
			name: 'scale',
			type: 'number',
			min: 30,
			max: 100,
			defaultValue: 80,
			admin: {
				condition: (_, sibling) => sibling?.type === 'image' && sibling?.fit !== 'cover',
			},
		},
		asset('guide', '가이드 이미지', ['guide']),
		{
			name: 'dimBackground',
			type: 'checkbox',
			label: '가이드 아래 디머',
			defaultValue: false,
			admin: { condition: visibleFor('guide') },
		},
		{
			name: 'sample',
			type: 'select',
			options: [...SAMPLE_OPTIONS],
			defaultValue: 'a',
			admin: { condition: visibleFor('layout-grid') },
		},
		...[MARGIN, GUTTER_X, GUTTER_Y].map(
			(control): Field => ({
				name: control.id,
				label: control.label,
				type: 'number',
				defaultValue: control.defaultValue,
				min: control.min,
				max: control.max,
				admin: { condition: visibleFor('layout-grid') },
			}),
		),
		{
			name: 'images',
			label: '레이아웃 이미지',
			type: 'relationship',
			relationTo: 'application-images',
			hasMany: true,
			admin: {
				condition: visibleFor('layout-overlay'),
				description: '크기 정보가 있는 래스터 이미지를 순서대로 선택합니다.',
			},
			filterOptions: {
				mimeType: { in: ['image/png', 'image/jpeg', 'image/webp', 'image/avif'] },
			},
			validate: requiredFor('layout-overlay'),
		},
		{
			name: 'languages',
			label: '표본 언어',
			type: 'array',
			dbName: 'langs',
			defaultValue: [{ language: 'ko' }],
			admin: { condition: visibleFor('type-weight') },
			validate: (value, { siblingData }) =>
				(siblingData as { type: string }).type !== 'type-weight' ||
				(Array.isArray(value) && value.length > 0) ||
				'표본 언어를 선택해 주세요.',
			fields: [
				{
					name: 'language',
					label: '언어',
					type: 'select',
					required: true,
					defaultValue: 'ko',
					options: LANGUAGES.map(({ key, label }) => ({ value: key, label })),
				},
			],
		},
		{
			name: 'weight',
			label: '기본 굵기',
			type: 'select',
			defaultValue: 'medium',
			options: WEIGHTS.map(({ key, label, value }) => ({
				value: key,
				label: `${label} (${value})`,
			})),
			admin: { condition: visibleFor('type-weight') },
		},
		{
			name: 'adjustable',
			label: '굵기 전환 허용',
			type: 'checkbox',
			defaultValue: true,
			admin: { condition: visibleFor('type-weight') },
		},
		{
			name: 'palette',
			label: '팔레트 조합',
			type: 'select',
			defaultValue: 'brand',
			options: PALETTES.map(({ id, name }) => ({ value: id, label: name })),
			admin: { condition: visibleFor('palette', 'logo-background') },
		},
		{
			name: 'variant',
			label: '팔레트 표현',
			type: 'select',
			defaultValue: 'swatches',
			options: [
				{ label: '컬러 스택', value: 'swatches' },
				{ label: '배경별 로고 사용 규정', value: 'logo-backgrounds' },
			],
			admin: { condition: visibleFor('palette') },
		},
		{
			name: 'paletteLayout',
			label: '스택 배치',
			type: 'select',
			defaultValue: 'uniform',
			options: [
				{ label: '균등', value: 'uniform' },
				{ label: '순위 비례', value: 'ranked' },
			],
			admin: {
				condition: (_, sibling) =>
					sibling?.type === 'palette' && sibling?.variant !== 'logo-backgrounds',
			},
		},
		{
			name: 'color',
			label: '색상',
			type: 'relationship',
			relationTo: 'brand-colors',
			admin: { condition: visibleFor('swatch') },
			validate: requiredFor('swatch'),
		},
		{
			name: 'logos',
			label: '로고 파일',
			type: 'group',
			admin: {
				condition: (_, sibling) =>
					sibling?.type === 'logo-background' ||
					(sibling?.type === 'palette' && sibling?.variant === 'logo-backgrounds'),
			},
			fields: ['default', 'white', 'mono', 'black'].map(
				(name): Field => ({ name, type: 'relationship', relationTo: [...ASSET_SOURCES] }),
			),
		},
		{
			name: 'opacity',
			label: '배경 불투명도',
			type: 'number',
			defaultValue: 1,
			min: 0,
			max: 1,
			admin: { condition: visibleFor('logo-background'), step: 0.05 },
		},
	],
}
