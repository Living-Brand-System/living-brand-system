import type { Field } from 'payload'
import { anchorField, guidelineRulesField } from '../blocks/fields'
import { CARD_RATIO_OPTIONS } from '../cards/displays/ratio'
import { ASSET_SOURCES, displayField } from './display-schema'
import { isGuidelineActionHref } from './model'

const sources = ASSET_SOURCES

function downloadField(section: boolean): Field {
	return {
		name: 'download',
		type: 'group',
		label: '다운로드',
		fields: [
			{
				name: 'source',
				type: 'select',
				defaultValue: 'none',
				required: true,
				options: [
					{ label: '없음', value: 'none' },
					{ label: section ? '해당 섹션 카드 에셋' : '표시 중인 에셋', value: 'assets' },
					{ label: '별도 파일 등록', value: 'registered' },
				],
			},
			{
				name: 'files',
				type: 'relationship',
				relationTo: [...sources],
				hasMany: true,
				admin: {
					condition: (_, sibling) => sibling?.source === 'registered',
					description: '현재는 브랜드 이미지·아이콘·로고 파일을 선택합니다.',
				},
				validate: (value, { siblingData }) =>
					(siblingData as { source?: string })?.source !== 'registered' ||
					(Array.isArray(value) && value.length > 0) ||
					'다운로드할 파일을 선택해 주세요.',
			},
		],
	}
}

const cards: Field = {
	name: 'cards',
	type: 'array',
	label: '카드',
	dbName: 'cards',
	fields: [
		{
			name: 'ratio',
			type: 'select',
			required: true,
			defaultValue: '4:3',
			options: [...CARD_RATIO_OPTIONS],
		},
		displayField,
		...(['backgroundColor', 'foregroundColor'] as const).map(
			(name): Field => ({
				name,
				type: 'relationship',
				relationTo: 'brand-colors',
				label: name === 'backgroundColor' ? '도판 배경색' : '도판 전경색',
				filterOptions: { _status: { equals: 'published' } },
				admin: {
					description:
						name === 'backgroundColor'
							? '비우면 디스플레이 기본 배경을 유지합니다. 색상 스와치 등 콘텐츠 자체의 색은 바꾸지 않습니다.'
							: '텍스트와 currentColor를 따르는 단색 도형에 적용합니다. 이미지·고유 색상·액션·가이드·캡션은 유지합니다.',
				},
			}),
		),
		{
			name: 'selectionLabel',
			type: 'text',
			localized: true,
			label: '이름 선택 라벨',
			admin: { description: '이름 선택형 캐러셀에서 사용합니다.' },
		},
		{
			name: 'status',
			type: 'select',
			label: '상태 표시',
			options: [
				{ label: '없음', value: 'none' },
				{ label: '허용', value: 'allowed' },
				{ label: '금지', value: 'prohibited' },
			],
			admin: {
				description:
					'비우면 섹션 기본값을 사용합니다. Incorrect Usages는 금지, 나머지는 없음입니다.',
			},
		},
		downloadField(false),
		{
			name: 'endActions',
			type: 'array',
			dbName: 'actions',
			label: 'END 액션',
			admin: {
				description:
					'다운로드 다음에 등록 순서대로 표시합니다. 비우면 추가 액션이 없습니다.',
			},
			fields: [
				{
					name: 'type',
					type: 'select',
					required: true,
					defaultValue: 'link',
					options: [
						{ label: '링크 이동', value: 'link' },
						{ label: '복사', value: 'copy' },
					],
				},
				{
					name: 'label',
					type: 'text',
					localized: true,
					required: true,
					label: '액션 이름',
					validate: (value: string | null | undefined) =>
						Boolean(value?.trim()) || '액션 이름을 입력해 주세요.',
				},
				{
					name: 'href',
					type: 'text',
					label: '링크 주소',
					admin: {
						condition: (_, sibling) => sibling?.type === 'link',
						description:
							'/studio/graph 같은 사이트 경로, #앵커 또는 https:// 주소를 입력합니다.',
					},
					validate: (
						value: string | null | undefined,
						{ siblingData }: { siblingData: { type?: string } },
					) =>
						siblingData?.type !== 'link' ||
						isGuidelineActionHref(value) ||
						'사이트 경로·앵커 또는 HTTP(S) 주소를 입력해 주세요.',
				},
				{
					name: 'value',
					type: 'textarea',
					localized: true,
					label: '복사할 내용',
					admin: { condition: (_, sibling) => sibling?.type === 'copy' },
					validate: (
						value: string | null | undefined,
						{ siblingData }: { siblingData: { type?: string } },
					) =>
						siblingData?.type !== 'copy' ||
						Boolean(value?.trim()) ||
						'복사할 내용을 입력해 주세요.',
				},
			],
		},
		{
			name: 'caption',
			type: 'group',
			label: '캡션',
			fields: [
				{
					name: 'type',
					type: 'select',
					required: true,
					defaultValue: 'basic',
					options: [
						{ label: '기본', value: 'basic' },
						{ label: '목록', value: 'list' },
						{ label: '명세', value: 'specification' },
					],
				},
				{ name: 'title', type: 'text', localized: true },
				{ name: 'description', type: 'textarea', localized: true },
				{
					name: 'rows',
					type: 'array',
					// 행 전체를 번역한다. 셀별 localized는 버전 조회의 SQL 별칭을 충돌시킨다.
					localized: true,
					dbName: 'rows',
					label: '항목',
					admin: { condition: (_, sibling) => sibling?.type !== 'basic' },
					fields: [
						{ name: 'label', type: 'text', label: '제목 / 라벨' },
						{
							name: 'value',
							type: 'textarea',
							required: true,
							label: '설명 / 값',
						},
					],
				},
			],
		},
	],
}

export const sectionsField: Field = {
	name: 'sections',
	type: 'array',
	label: '섹션',
	dbName: 'sections',
	admin: {
		condition: (data) => data.contentModel === 'sections',
		description:
			'섹션과 서브섹션을 같은 목록에서 순서대로 편집합니다. 컨테이너에서 카드 배치를 선택합니다.',
	},
	validate: (value) => {
		if (!Array.isArray(value)) return true
		const anchors = new Set<string>()
		let hasMain = false
		for (const row of value) {
			if (!row || typeof row !== 'object') return '섹션 형식이 올바르지 않습니다.'
			const section = row as { type?: string; anchor?: string }
			if (section.type === 'subsection' && !hasMain)
				return '서브섹션 앞에 메인 섹션이 필요합니다.'
			if (section.type !== 'subsection') hasMain = true
			if (section.anchor && anchors.has(section.anchor)) return '섹션 앵커가 중복됩니다.'
			if (section.anchor) anchors.add(section.anchor)
		}
		for (const section of value as {
			containers?: {
				cards?: {
					display?: { type?: string; logos?: { black?: unknown; white?: unknown } }
				}[]
			}[]
		}[]) {
			for (const container of section.containers ?? []) {
				for (const { display } of container.cards ?? []) {
					if (
						display?.type === 'logo-background' &&
						(!display.logos?.black || !display.logos?.white)
					)
						return '로고 배경색 선택에는 Black·White 로고 파일이 모두 필요합니다.'
				}
			}
		}
		return true
	},
	fields: [
		{
			name: 'type',
			type: 'select',
			required: true,
			defaultValue: 'section',
			options: [
				{ label: 'Section', value: 'section' },
				{ label: 'Subsection', value: 'subsection' },
				{ label: 'Incorrect Usages', value: 'incorrect-usages' },
			],
		},
		{
			name: 'title',
			type: 'text',
			localized: true,
			admin: { condition: (_, sibling) => sibling?.type !== 'incorrect-usages' },
			validate: (
				value: string | null | undefined,
				{ siblingData }: { siblingData: { type?: string } },
			) =>
				siblingData?.type === 'incorrect-usages' ||
				Boolean(value?.trim()) ||
				'제목을 입력해 주세요.',
			hooks: {
				beforeValidate: [
					({ value, siblingData }) =>
						siblingData?.type === 'incorrect-usages' ? 'Incorrect Usages' : value,
				],
			},
		},
		anchorField(),
		{ name: 'description', type: 'textarea', localized: true },
		{
			name: 'align',
			type: 'select',
			defaultValue: 'start',
			options: [
				{ label: '시작', value: 'start' },
				{ label: '중앙', value: 'center' },
			],
			admin: { condition: (_, sibling) => sibling?.type !== 'incorrect-usages' },
		},
		downloadField(true),
		{
			name: 'containers',
			type: 'array',
			dbName: 'containers',
			label: '컨테이너',
			validate: (value) => {
				if (!Array.isArray(value)) return true
				for (const container of value as {
					type?: string
					navigation?: string
					cards?: { selectionLabel?: string }[]
				}[]) {
					if (
						container.type === 'carousel' &&
						container.navigation === 'labels' &&
						container.cards?.some((card) => !card.selectionLabel?.trim())
					)
						return '이름 선택형 캐러셀의 모든 카드에 선택 라벨을 입력해 주세요.'
				}
				return true
			},
			defaultValue: [{ type: 'grid', columns: '3', size: 'md', cards: [] }],
			fields: [
				{
					name: 'type',
					type: 'select',
					required: true,
					defaultValue: 'grid',
					options: [
						{ label: 'Grid', value: 'grid' },
						{ label: 'Carousel', value: 'carousel' },
						{ label: 'Sticky', value: 'sticky' },
					],
				},
				{
					name: 'columns',
					type: 'select',
					label: '최대 열 수',
					required: true,
					defaultValue: '3',
					options: ['1', '2', '3', '4', '5'],
					admin: { condition: (_, sibling) => sibling?.type === 'grid' },
				},
				{
					name: 'size',
					type: 'select',
					label: 'Size',
					admin: { condition: (_, sibling) => sibling?.type === 'grid' },
					required: true,
					defaultValue: 'md',
					options: [
						{ label: 'X Small', value: 'xs' },
						{ label: 'Small', value: 'sm' },
						{ label: 'Medium', value: 'md' },
						{ label: 'Large', value: 'lg' },
						{ label: 'X Large', value: 'xl' },
					],
				},
				{
					name: 'height',
					label: '캐러셀 높이',
					type: 'select',
					defaultValue: 'md',
					options: [
						{ label: 'Small', value: 'sm' },
						{ label: 'Medium', value: 'md' },
						{ label: 'Large', value: 'lg' },
						{ label: 'X Large', value: 'xl' },
					],
					admin: { condition: (_, sibling) => sibling?.type === 'carousel' },
				},
				{
					name: 'navigation',
					label: '캐러셀 탐색',
					type: 'select',
					defaultValue: 'counter',
					options: [
						{ label: '일반 (카운터)', value: 'counter' },
						{ label: '이름 선택', value: 'labels' },
					],
					admin: { condition: (_, sibling) => sibling?.type === 'carousel' },
				},
				{
					name: 'loop',
					label: '무한 반복',
					type: 'checkbox',
					defaultValue: true,
					admin: { condition: (_, sibling) => sibling?.type === 'carousel' },
				},
				{
					name: 'autoplay',
					label: '자동 재생',
					type: 'checkbox',
					defaultValue: false,
					admin: {
						condition: (_, sibling) => sibling?.type === 'carousel',
						description: '재생 간격은 3초입니다.',
					},
				},
				{
					name: 'stickyMode',
					label: '스티키 방식',
					type: 'select',
					defaultValue: 'switch',
					options: [
						{ label: '스크롤 전환형', value: 'switch' },
						{ label: '개별 고정형', value: 'individual' },
					],
					admin: { condition: (_, sibling) => sibling?.type === 'sticky' },
				},
				cards,
			],
		},
		guidelineRulesField(),
	],
}
