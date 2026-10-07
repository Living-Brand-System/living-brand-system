import { APIError, type CollectionConfig } from 'payload'
import { MAX_PRINT_SIDE_PIXELS } from '@/features/studio-export/print-policy'
import { findTemplateDefaultSessionBlocker } from '@/features/template-core/domain/template-default-session'
import { prepareTemplateSave } from '@/features/template-import/services/prepare-template-save.service'
import { isManager, managerManagedPublishedAccess } from '@/lib/auth'
import { previewImageField } from './fields/preview-image-field'
import { studioExportPolicyField } from './fields/studio-controller-field'
import { templateBackgroundPolicyField } from './fields/template-policy-field'
import { urlSlugField } from './fields/url-slug-field'
import { draftVersions, keepPublishedOnRestore } from './shared'

const TEMPLATE_SIZE_UNIT = '/components/admin/templates/template-size-unit#TemplateSizeUnit'

type TemplateSizeData = {
	outputKind?: 'digital' | 'print' | null
	width?: number | null
	height?: number | null
	size?: { width?: number | null; height?: number | null } | null
}

/** 디지털판의 판형 크기를 비워 두면 Figma 판 크기(px)로 채운다. 인쇄판(mm)은 사람이 적는다. */
function fillDigitalSize(side: 'width' | 'height') {
	return ({ value, data }: { value?: unknown; data?: Partial<TemplateSizeData> }) =>
		value == null && data?.outputKind !== 'print' ? (data?.[side] ?? value) : value
}

/**
 * 판형 크기는 1 이상의 정수이고 Figma 판과 가로세로 비율이 같아야 한다(1% 안). 디지털 px는 브라우저 캔버스가
 * 그릴 수 있는 한 변 16,384px까지다.
 */
function validateTemplateSize(side: 'width' | 'height') {
	return (value: unknown, { data }: { data: Partial<TemplateSizeData> }) => {
		const unit = data.outputKind === 'print' ? 'mm' : 'px'
		if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
			return `판형 크기는 1 이상의 정수(${unit})로 적어야 합니다.`
		}
		if (unit === 'px' && value > MAX_PRINT_SIDE_PIXELS) {
			return `디지털 판형은 한 변 ${MAX_PRINT_SIDE_PIXELS.toLocaleString('ko-KR')}px까지입니다.`
		}
		const width = data.size?.width
		// 비율은 한 칸에서만 본다 — 두 칸에 같은 오류가 겹쳐 뜨지 않게.
		if (side === 'height' && typeof width === 'number' && data.width && data.height) {
			const drift = Math.abs(width / value / (data.width / data.height) - 1)
			if (drift > 0.01) {
				return `가로세로 비율이 Figma 판(${data.width}×${data.height}px)과 다릅니다. 같은 비율로 적으세요.`
			}
		}
		return true
	}
}

export const Templates: CollectionConfig = {
	slug: 'templates',
	access: managerManagedPublishedAccess,
	hooks: {
		// 모든 HTML 저장은 실행 마크업과 외부 URL을 차단한다. 브랜드 에셋 published 검증은
		// 발행 시에만 추가하고, draft의 staging 에셋은 manager/admin에게만 보인다 (docs/07).
		beforeChange: [
			keepPublishedOnRestore,
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
		urlSlugField({ useAsSlug: 'name' }),
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
		{
			// 스튜디오 「기본값으로 저장」이 남기는 화면 상태 — 모든 사용자의 스튜디오가 이 화면으로 시작한다.
			// 쓰기는 컬렉션 access(manager 이상)가 막는다.
			name: 'defaultSession',
			type: 'json',
			admin: { hidden: true },
			validate: (value: unknown) => findTemplateDefaultSessionBlocker(value) ?? true,
		},

		// ── 사이드바 (렌더 순서 = 배열 순서) ──
		previewImageField({ required: false }),
		// Figma 판 크기(px) — 가져오기가 채우는 디자인 좌표계라 평소엔 볼 일이 없어 접어 둔다. 판형은 아래 「판형 크기」가 정한다.
		{
			type: 'collapsible',
			label: 'Figma 판 크기',
			admin: { position: 'sidebar', initCollapsed: true },
			fields: [
				{
					type: 'row',
					fields: [
						{
							name: 'width',
							type: 'number',
							label: '너비(px)',
							admin: { width: '50%', description: '가져오기가 채웁니다.' },
						},
						{
							name: 'height',
							type: 'number',
							label: '높이(px)',
							admin: { width: '50%', description: '가져오기가 채웁니다.' },
						},
					],
				},
			],
		},
		// 🔴 재import는 baseHtml·html·overrides·width·height·sourceUrl만 덮는다 — 판형은 사람만 정한다.
		// 🔑 템플릿은 디지털(px)과 인쇄(mm) 중 하나만이다(사용자 결정 2026-10-07). 디지털을 mm로 인쇄하는
		//    길은 없다. 인쇄판은 mm가 정본이고 dpi는 창작자가 「출력 설정 → 인쇄」의 목록에서 고르며,
		//    파일 px는 mm × dpi로 계산된다. 판(px)은 인쇄판에선 디자인 좌표계일 뿐이다.
		{
			name: 'outputKind',
			type: 'radio',
			label: '판형 종류',
			required: true,
			defaultValue: 'digital',
			options: [
				{ label: '디지털 (px · PNG·JPG·MP4)', value: 'digital' },
				{ label: '인쇄 (mm · PDF·TIFF·SVG)', value: 'print' },
			],
			admin: { position: 'sidebar', layout: 'horizontal' },
		},
		{
			name: 'size',
			type: 'group',
			label: '판형 크기',
			admin: {
				position: 'sidebar',
				description: '디지털은 px, 인쇄는 mm입니다.',
			},
			fields: [
				{
					type: 'row',
					fields: [
						{
							name: 'width',
							type: 'number',
							label: '가로',
							admin: {
								width: '50%',
								components: { afterInput: [TEMPLATE_SIZE_UNIT] },
							},
							hooks: { beforeValidate: [fillDigitalSize('width')] },
							validate: validateTemplateSize('width'),
						},
						{
							name: 'height',
							type: 'number',
							label: '세로',
							admin: {
								width: '50%',
								components: { afterInput: [TEMPLATE_SIZE_UNIT] },
							},
							hooks: { beforeValidate: [fillDigitalSize('height')] },
							validate: validateTemplateSize('height'),
						},
					],
				},
			],
		},
		// ponytail: 옛 판형 해상도 칸 — 값은 마이그레이션이 인쇄 판형(mm)으로 옮겼다. 다음 정리 때 컬럼째 지운다.
		{
			name: 'canvasPpi',
			type: 'number',
			admin: { hidden: true },
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
