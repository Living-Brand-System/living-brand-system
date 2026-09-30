import { APIError, type CollectionConfig, slugField } from 'payload'
import { isPrintPpi, MAX_PRINT_PPI, MIN_PRINT_PPI } from '@/features/studio-export/print-policy'
import { prepareTemplateSave } from '@/features/template-import/services/prepare-template-save.service'
import { isManager, managerOrAdmin } from '@/lib/auth'
import { previewImageField } from './fields/preview-image-field'
import { studioExportPolicyField } from './fields/studio-controller-field'
import { templateBackgroundPolicyField } from './fields/template-policy-field'
import { draftVersions } from './shared'

export const Templates: CollectionConfig = {
	slug: 'templates',
	access: {
		read: ({ req }) =>
			isManager(req.user) || {
				_status: { equals: 'published' },
			},
		create: managerOrAdmin,
		update: managerOrAdmin,
		delete: managerOrAdmin,
	},
	hooks: {
		// 모든 HTML 저장은 실행 마크업과 외부 URL을 차단한다. 브랜드 에셋 published 검증은
		// 발행 시에만 추가하고, draft의 staging 에셋은 manager/admin에게만 보인다 (docs/07).
		beforeChange: [
			async ({ data, originalDoc, req }) => {
				const blocker = await prepareTemplateSave({ data, originalDoc, req })
				if (blocker) throw new APIError(blocker, 400)

				return data
			},
		],
	},
	labels: {
		singular: '템플릿',
		plural: '템플릿',
	},
	admin: {
		group: '제작 도구',
		useAsTitle: 'name',
		defaultColumns: ['name', 'updatedAt'],
	},
	versions: draftVersions,
	fields: [
		{
			name: 'name',
			type: 'text',
			required: true,
			localized: true,
		},
		// 🔴 slug는 localized가 아니다 — URL은 정체성이라 로케일마다 달라지면 링크가 갈라진다.
		// name은 localized지만 slug는 한 번 파생된 뒤 그 값으로 고정된다(ImageProfiles와 같은 방식).
		slugField({
			useAsSlug: 'name',
			required: true,
			// 🔴 Payload 기본 slugify는 `[^\w-]+`를 버려 한글 이름이 전부 사라진다
			// ('환영 카드' → '-'). 그대로 두면 두 번째 한글 템플릿이 slug unique 인덱스에
			// 걸려 DB 오류로 저장이 깨진다. 낱말이 하나도 안 남으면 빈 값을 돌려주어
			// required 검증이 "직접 입력하세요"로 막게 한다 — 실패를 DB가 아니라 폼에서 낸다.
			slugify: ({ valueToSlugify }) => {
				const slug =
					valueToSlugify
						?.trim()
						.replace(/ /g, '-')
						.replace(/[^\w-]+/g, '')
						.toLowerCase() ?? ''
				return /[a-z0-9]/.test(slug) ? slug : ''
			},
			// slug은 영문 소문자·숫자·하이픈만 받는다 — URL 세그먼트이므로 인코딩이 필요한 문자를
			// 애초에 들이지 않는다. 이름이 영문이면 위 slugify가 알아서 채우고, 한글이면 비어서
			// 이 검증이 "직접 입력하세요"로 막는다.
			overrides: (field) => {
				const slug = field.fields.find(
					(candidate) => 'name' in candidate && candidate.name === 'slug',
				)
				if (slug?.type === 'text') {
					slug.validate = (value: unknown) =>
						typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
							? true
							: '영문 소문자·숫자·하이픈만 사용하세요. 예: summer-poster'
				}
				return field
			},
		}),
		{
			name: 'description',
			type: 'textarea',
			localized: true,
		},
		{
			// 워크스페이스: 캔버스 + 레이어 목록 + 값 편집을 한 컴포넌트가 렌더한다.
			name: 'templateLayers',
			type: 'ui',
			admin: {
				components: {
					Field: '/components/admin/templates/template-layers-field#TemplateLayersField',
				},
			},
		},
		templateBackgroundPolicyField(),
		studioExportPolicyField({ source: 'template' }),
		// 출처 URL. 입력창은 사이드바의 Figma 가져오기 필드와 통합했으므로 폼에서 숨긴다(컬럼·값 유지).
		{
			name: 'sourceUrl',
			type: 'text',
			access: { read: ({ req }) => isManager(req.user) },
			admin: { hidden: true },
		},
		// 오버라이드 레이어: Figma import 원본(baseHtml) + 앱 편집(overrides). 렌더 html은 이 둘의 합성 결과다.
		// 재import는 baseHtml만 갱신하고 overrides를 유지 → html 재합성 → 앱 편집 보존.
		{
			name: 'baseHtml',
			type: 'code',
			access: { read: ({ req }) => isManager(req.user) },
			admin: { hidden: true, language: 'html' },
		},
		{
			// 저작 내부값(input.aiInstruction·generatedImageId·vectorAsset 등)을 담으므로 공개
			// REST(published read)에서 감춘다. 서버 신뢰 경로(published-template·agent-template
			// repository)는 overrideAccess: true의 local API로 읽어 영향이 없다.
			name: 'overrides',
			type: 'json',
			access: { read: ({ req }) => isManager(req.user) },
			admin: { hidden: true },
		},

		// ── 사이드바 (렌더 순서 = 배열 순서) ──
		previewImageField(),
		{
			type: 'row',
			admin: { position: 'sidebar' },
			fields: [
				{
					name: 'width',
					type: 'number',
					admin: { width: '50%', description: 'Figma 너비(px). 가져오기가 채웁니다.' },
				},
				{
					name: 'height',
					type: 'number',
					admin: { width: '50%', description: 'Figma 높이(px). 가져오기가 채웁니다.' },
				},
			],
		},
		// 🔴 재import는 baseHtml·html·overrides·width·height·sourceUrl만 덮는다 — 이 값은 사람만 정한다.
		//    이름을 printPpi로 하지 말 것: 그 컬럼은 옛 enum 정책 필드였고 exportPolicy.print.allowedPpi와도 헷갈린다.
		{
			name: 'canvasPpi',
			type: 'number',
			label: '판형 해상도(ppi)',
			min: MIN_PRINT_PPI,
			max: MAX_PRINT_PPI,
			// 🔴 기본값을 두지 않는다 — 300을 깔면 기존 디지털 템플릿이 전부 인쇄판으로 선언된다.
			admin: {
				position: 'sidebar',
				description:
					'이 판을 인쇄물로 선언합니다. 물리 크기 = 위 px ÷ ppi × 25.4mm (예: 2480×3508px에 300 → A4). 소수도 됩니다 — 630×891px 판을 정확히 A4로 선언하려면 76.2입니다. 비우면 디지털판이라 mm를 쓰지 않고, 창작자가 인쇄 해상도를 직접 고릅니다.',
			},
			// 커스텀 validate는 기본 min/max 검증을 대체한다 — isPrintPpi 하나가 정수·범위를 모두 본다.
			validate: (value: unknown) =>
				value === null || value === undefined || isPrintPpi(value)
					? true
					: `판형 해상도는 ${MIN_PRINT_PPI}~${MAX_PRINT_PPI} 사이 숫자여야 합니다.`,
		},
		{
			name: 'category',
			type: 'relationship',
			relationTo: 'template-categories',
			required: true,
			index: true,
			admin: {
				position: 'sidebar',
				description: 'Create 화면 사이드바에서 이 템플릿이 속할 카테고리입니다.',
			},
		},
		{
			name: 'dividerChecks',
			type: 'ui',
			admin: {
				position: 'sidebar',
				components: { Field: '/components/admin/templates/sidebar-divider#SidebarDivider' },
			},
		},
		{
			name: 'dividerImport',
			type: 'ui',
			admin: {
				position: 'sidebar',
				components: { Field: '/components/admin/templates/sidebar-divider#SidebarDivider' },
			},
		},
		{
			// sourceUrl 입력 + 가져오기 버튼을 겸한다(입력창은 sourceUrl 폼 필드를 편집).
			name: 'figmaHtmlImport',
			type: 'ui',
			admin: {
				position: 'sidebar',
				components: {
					Field: '/components/admin/templates/figma-html-import-field#FigmaHtmlImportField',
				},
			},
		},
		{
			// 렌더 결과 HTML = baseHtml ⊕ overrides 합성물. 워크스페이스가 자동 재합성하므로 읽기 전용(직접 편집 X).
			type: 'collapsible',
			label: '디자인 HTML (합성 결과)',
			admin: { position: 'sidebar', initCollapsed: true },
			fields: [
				{
					name: 'html',
					type: 'code',
					admin: {
						language: 'html',
						readOnly: true,
						description:
							'baseHtml(Figma 원본) + overrides(앱 편집)의 합성 결과입니다. 워크스페이스 편집·재import 시 자동 갱신됩니다.',
					},
				},
			],
		},
	],
}
