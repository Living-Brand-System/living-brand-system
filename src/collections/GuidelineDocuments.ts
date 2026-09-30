import { type CollectionConfig, slugField } from 'payload'
import { guidelineRulesField } from '@/features/guideline/blocks/fields'
import { guidelineBlocks } from '@/features/guideline/blocks/registry'
import { validateGuidelineDocumentSlug } from '@/features/guideline/checks/validate-guideline-document-slug'
import { sectionsField } from '@/features/guideline/sections/schema'
import { managerManagedAccess } from '@/lib/auth'
import { guidelineDraftVersions } from './shared'

const previewURL = (id: unknown) =>
	typeof id === 'number' || typeof id === 'string'
		? `/api/guideline-documents/${encodeURIComponent(String(id))}/preview`
		: null

export const GuidelineDocuments: CollectionConfig = {
	slug: 'guideline-documents',
	dbName: 'guideline_docs',
	access: managerManagedAccess,
	labels: {
		singular: '가이드라인 토픽',
		plural: '가이드라인 토픽',
	},
	admin: {
		group: '가이드라인',
		useAsTitle: 'title',
		// 표시 순서가 목록의 정렬 기준이므로 열로 내놓는다 — 안 보이면 왜 이 순서인지 알 수 없다.
		defaultColumns: ['title', 'chapter', 'slug', '_status', 'displayOrder', 'updatedAt'],
		description: '챕터에 속한 토픽 한 장입니다. 본문은 섹션 블록으로 나눕니다.',
		// 🔴 문서는 설명·면(배경색·톤)을 갖지 않는다(2026-08-26 제거). 설명은 전 문서에서 값이 하나도
		//    없었고 토픽 화면이 그리지도 않았다. 면(배경) 설정은 2026-09-04에 전 계층에서 걷었다 —
		//    브랜드 면은 위젯이 자기 규정으로 그린다.
		// 🔴 커스텀 목록 뷰는 폐기했다(2026-08-26). 계층을 재귀 트리로 그리려고 만든 것인데
		//    챕터가 별도 컬렉션이 되면서 그릴 계층이 없어졌다 — Payload 기본 목록이 열 몇 개로
		//    같은 것을 보여준다. PublishButton은 남긴다: Better Editor의 유일한 진입점이다.
		components: {
			edit: {
				PublishButton:
					'/components/admin/guideline-documents/better-editor-publish-button#BetterEditorPublishButton',
			},
		},
		livePreview: {
			url: ({ data }) => previewURL(data.id),
		},
		preview: (data) => previewURL(data.id),
	},
	versions: guidelineDraftVersions,
	defaultSort: 'displayOrder',
	fields: [
		// 🔴 챕터는 별도 컬렉션이다(2026-08-26). 계층을 문서 자기참조로 표현하던 시절에는
		//    최상위 문서가 곧 챕터였는데, 그 문서가 제목·slug 말고 아무것도 갖지 않아 분류를
		//    문서로 흉내내고 있었다. 이제 관계 하나로 말한다.
		{
			name: 'chapter',
			type: 'relationship',
			relationTo: 'guideline-chapters',
			required: true,
			admin: {
				position: 'main',
				description: '이 토픽이 속한 챕터입니다. URL의 첫 조각이 됩니다.',
			},
		},
		{
			name: 'title',
			type: 'text',
			required: true,
			localized: true,
		},
		// 🔴 slug는 localized가 아니다(2026-09-04). URL은 언어를 가리지 않는다 — 섹션 앵커와 같은
		//    이유로, 로케일마다 slug가 갈리면 공유한 링크가 언어를 바꾸는 순간 끊긴다.
		//    (제목 위 라벨 `label` 필드는 같은 날 지웠다 — 어디에서도 그리지 않았다.)
		slugField({
			disableUnique: true,
			useAsSlug: 'title',
			required: true,
			overrides: (field) => {
				const slug = field.fields[1]
				if (slug && 'hooks' in slug) {
					slug.hooks = {
						...slug.hooks,
						beforeChange: [
							...(slug.hooks?.beforeChange ?? []),
							validateGuidelineDocumentSlug,
						],
					}
				}
				return field
			},
		}),
		{
			name: 'headerImage',
			type: 'upload',
			relationTo: 'application-images',
			admin: {
				position: 'sidebar',
				description: '토픽 헤더에 표시할 선택 이미지입니다.',
			},
		},
		{
			name: 'contentModel',
			type: 'select',
			label: '본문 형식',
			defaultValue: 'legacy',
			options: [
				{ label: '기존 본문', value: 'legacy' },
				{ label: '신규 섹션', value: 'sections' },
			],
			admin: {
				description:
					'신규 계약으로 작성할 문서는 신규 섹션을 선택합니다. 기존 본문은 삭제하지 않습니다.',
			},
		},
		sectionsField,
		{
			name: 'blocks',
			type: 'blocks',
			label: '본문',
			blocks: guidelineBlocks,
			admin: { condition: (data) => data.contentModel !== 'sections' },
		},
		guidelineRulesField(),
		{
			name: 'displayOrder',
			type: 'number',
			required: true,
			defaultValue: 0,
			min: 0,
			admin: {
				position: 'sidebar',
				description: '숫자가 낮을수록 같은 챕터 안에서 먼저 표시됩니다.',
			},
		},
	],
}
