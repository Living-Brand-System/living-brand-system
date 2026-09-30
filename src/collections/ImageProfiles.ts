import {
	APIError,
	type CollectionConfig,
	type FieldAccess,
	type PayloadRequest,
	slugField,
} from 'payload'
import {
	DEFAULT_IMAGE_MODEL_PRESET,
	IMAGE_MODEL_PRESET_OPTIONS,
} from '@/features/image-generation/domain/image-model'
import {
	imagePromptNormalizationRequestSchema,
	validateImageProfilePromptRows,
	validateImagePromptNormalizationRows,
} from '@/features/image-generation/domain/image-profile-prompt'
import {
	deriveImageStudioConfig,
	type PublishedImageProfileDefinition,
} from '@/features/image-generation/domain/image-studio-config'
import { imageGenerationErrorResponse } from '@/features/image-generation/respond-image-generation'
import { normalizeImageProfilePrompt } from '@/features/image-generation/services/normalize-image-profile-prompt.service'
import {
	assertImageProfileUnpinned,
	isUnpublishTransition,
} from '@/features/template-core/services/guard-template-references.service'
import { isManager, managerManagedAccess } from '@/lib/auth'
import { imageProfileFeaturesField } from './fields/image-profile-features-field'
import { previewImageField } from './fields/preview-image-field'
import {
	studioControllerPresentationField,
	studioControllerRestrictionsField,
	studioExportPolicyField,
} from './fields/studio-controller-field'
import { draftVersions } from './shared'

const managerFieldRead: FieldAccess = ({ req }) => isManager(req.user)

async function normalizePromptEndpoint(req: PayloadRequest) {
	if (!isManager(req.user)) {
		return Response.json({ message: 'Forbidden' }, { status: 403 })
	}

	const parsed = imagePromptNormalizationRequestSchema.safeParse(
		req.json ? await req.json().catch(() => null) : null,
	)
	if (!parsed.success) {
		return Response.json(
			{ message: '프롬프트 테이블과 유저 인풋을 확인하세요.' },
			{ status: 400 },
		)
	}

	try {
		return Response.json(await normalizeImageProfilePrompt(parsed.data))
	} catch (error) {
		req.payload.logger.error({ err: error }, 'image-prompt-normalization.failed')
		return (
			imageGenerationErrorResponse(error, {
				ImageGenerationUnavailableError: 'AI 프롬프트 정규화가 설정되지 않았습니다.',
			}) ?? Response.json({ message: '프롬프트 정규화에 실패했습니다.' }, { status: 500 })
		)
	}
}

export const ImageProfiles: CollectionConfig = {
	slug: 'image-profiles',
	dbName: 'image_profiles',
	access: managerManagedAccess,
	hooks: {
		// 발행 템플릿의 overrides가 imageInput.profileId로 고정한 프로파일은 삭제·발행 해제를 거부한다.
		beforeChange: [
			async ({ data, originalDoc, req }) => {
				if (isUnpublishTransition({ data, originalDoc, req })) {
					await assertImageProfileUnpinned(req, Number(originalDoc?.id), '발행 해제')
				}

				const effective = { ...originalDoc, ...data }
				if (effective._status === 'published') {
					try {
						deriveImageStudioConfig({
							...effective,
							// create의 beforeChange에는 DB id가 아직 없으므로 계약 검증용 유한값을 쓴다.
							id: Number(effective.id ?? 0),
						} as PublishedImageProfileDefinition)
					} catch (error) {
						throw new APIError(
							error instanceof Error
								? error.message
								: '이미지 컨트롤러 계약을 확인하세요.',
							400,
						)
					}
				}
				return data
			},
		],
		beforeDelete: [({ id, req }) => assertImageProfileUnpinned(req, Number(id), '삭제')],
	},
	admin: {
		group: '제작 도구',
		useAsTitle: 'name',
		defaultColumns: ['name', 'slug', 'displayOrder', '_status', 'updatedAt'],
		description: '이미지 유형별 시스템 프롬프트와 유저 프롬프트 후보를 관리하고 테스트합니다.',
	},
	defaultSort: 'displayOrder',
	labels: {
		singular: '이미지 프로파일',
		plural: '이미지 프로파일',
	},
	versions: draftVersions,
	endpoints: [
		{
			path: '/normalize',
			method: 'post',
			handler: normalizePromptEndpoint,
		},
	],
	fields: [
		{
			name: 'name',
			type: 'text',
			required: true,
			label: '프로파일 이름',
		},
		slugField({
			useAsSlug: 'name',
			required: true,
		}),
		previewImageField(),
		{
			name: 'displayOrder',
			type: 'number',
			required: true,
			defaultValue: 0,
			min: 0,
			admin: {
				position: 'sidebar',
				description: '숫자가 낮을수록 Studio 내비게이션에서 먼저 표시됩니다.',
			},
		},
		{
			name: 'imageModelPreset',
			type: 'select',
			access: { read: managerFieldRead },
			required: true,
			defaultValue: DEFAULT_IMAGE_MODEL_PRESET,
			options: [...IMAGE_MODEL_PRESET_OPTIONS],
			label: '이미지 모델',
			admin: {
				position: 'sidebar',
				description: '이 프로파일을 생성할 때 사용할 이미지 모델입니다.',
			},
		},
		{
			name: 'profilePrompt',
			type: 'array',
			access: { read: managerFieldRead },
			dbName: 'img_profile_prompt',
			required: true,
			minRows: 1,
			label: '시스템 프롬프트',
			labels: { singular: '프롬프트 필드', plural: '프롬프트 필드' },
			validate: validateImageProfilePromptRows,
			admin: {
				initCollapsed: false,
				description:
					'이미지 유형의 기본값입니다. 각 행은 최종 JSON의 주제와 프롬프트가 됩니다.',
			},
			fields: [
				{ name: 'key', type: 'text', required: true, label: '주제' },
				{ name: 'value', type: 'textarea', required: true, label: '프롬프트' },
			],
		},
		{
			name: 'userPromptNormalization',
			type: 'array',
			access: { read: managerFieldRead },
			dbName: 'img_prompt_norm',
			label: '유저 프롬프트',
			labels: { singular: '유저 프롬프트', plural: '유저 프롬프트' },
			validate: validateImagePromptNormalizationRows,
			admin: {
				initCollapsed: false,
				description:
					'선택사항입니다. 행이 있으면 AI가 후보 중 하나로 정규화하고 유저 인풋 원문은 최종 프롬프트에서 제외합니다. 비어 있으면 원문을 subject로 사용합니다.',
			},
			fields: [
				{ name: 'key', type: 'text', required: true, label: '주제' },
				{
					name: 'candidates',
					type: 'array',
					dbName: 'img_prompt_choices',
					required: true,
					minRows: 1,
					label: '프롬프트 후보',
					labels: { singular: '프롬프트 후보', plural: '프롬프트 후보' },
					fields: [
						{ name: 'value', type: 'textarea', required: true, label: '프롬프트' },
					],
				},
			],
		},
		imageProfileFeaturesField(),
		studioControllerRestrictionsField({ source: 'image' }),
		studioControllerPresentationField({ source: 'image' }),
		studioExportPolicyField({
			source: 'image',
			includeOriginal: true,
		}),
		{
			name: 'generationTest',
			type: 'ui',
			admin: {
				components: {
					Field: '/components/admin/image-profiles/image-profile-test-panel#ImageProfileTestPanel',
				},
			},
		},
	],
}
