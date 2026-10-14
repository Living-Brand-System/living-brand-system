'use client'

import { ManagerOverlay } from '@/components/studio/shared/manager-overlay'
import type { useProfilePreview } from '@/components/studio/shared/use-profile-preview'
import { BackgroundPolicyForm } from '@/components/studio/template/manager-forms/background-form'
import {
	isTemplateCiColorKey,
	TemplateCiColorManagerForm,
} from '@/components/studio/template/manager-forms/ci-form'
import {
	isTemplateExportAxis,
	TemplateExportManagerForm,
} from '@/components/studio/template/manager-forms/export-form'
import {
	TemplateColorManagerForm,
	TemplatePromptManagerForm,
	TemplateSampleManagerForm,
} from '@/components/studio/template/manager-forms/foundation-forms'
import {
	TemplateCanvasManagerForm,
	TemplateCategoryManagerForm,
	TemplateDefaultsManagerForm,
	TemplateNameManagerForm,
} from '@/components/studio/template/manager-forms/identity-forms'
import {
	TemplateImageProfileManagerForm,
	TemplateImageTransformManagerForm,
} from '@/components/studio/template/manager-forms/image-forms'
import {
	isManagedLayerKind,
	TemplateLayersManagerForm,
} from '@/components/studio/template/manager-forms/layers-form'
import { TemplateOutputManagerForm } from '@/components/studio/template/manager-forms/output-form'
import { TemplateTextManagerForm } from '@/components/studio/template/manager-forms/text-form'
import { TemplateThumbnailManagerForm } from '@/components/studio/template/manager-forms/thumbnail-form'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'

/** 배경 정책 폼으로 가는 공용 컨트롤 줄(`control:<id>`) — Mode·Dimming Use. */
const BACKGROUND_CONTROL_KEYS = new Set(['background.type', 'background.dimmer'])

/**
 * 템플릿 편집 화면의 Manager mode — 종류(`data-manager-target`의 앞부분)마다 관리 폼을 등록한다.
 * 원본 컨트롤러는 표시만 달고, 폼은 `manager-forms/`에 따로 산다. 새 칸은 표시 + 여기 한 줄이다.
 * 한 종류를 여러 폼이 나눠 쓰면(`control:`·`profile:`) 열쇠로 고른다.
 */
export function TemplateManagerOverlay({
	preview,
}: {
	preview: ReturnType<typeof useProfilePreview>
}) {
	const { config } = useTemplateStudio()
	return (
		<ManagerOverlay
			forms={{
				text: {
					title: '칸 설정',
					render: (nodeId) => <TemplateTextManagerForm nodeId={nodeId} />,
				},
				layers: {
					title: '레이어 이름·순서·편집 권한',
					accepts: isManagedLayerKind,
					render: (kind) =>
						isManagedLayerKind(kind) ? <TemplateLayersManagerForm kind={kind} /> : null,
				},
				background: {
					title: '배경 설정',
					render: () => <BackgroundPolicyForm />,
				},
				control: {
					title: (key) =>
						BACKGROUND_CONTROL_KEYS.has(key)
							? '배경 설정'
							: key === 'prompt'
								? '이미지 프로파일'
								: 'CI 색 버전',
					// 그 밖의 줄(그래픽 런타임 노브·Image Mode·Dimming Strength·색 폴백)은 관리하지 않는다.
					accepts: (key) =>
						BACKGROUND_CONTROL_KEYS.has(key) ||
						key === 'prompt' ||
						isTemplateCiColorKey(config, key),
					render: (key) =>
						BACKGROUND_CONTROL_KEYS.has(key) ? (
							<BackgroundPolicyForm
								focus={key === 'background.dimmer' ? 'dimmer' : 'types'}
							/>
						) : key === 'prompt' ? (
							<TemplatePromptManagerForm />
						) : (
							<TemplateCiColorManagerForm controlId={key} />
						),
				},
				profile: {
					title: (key) => (key === 'background' ? '배경 설정' : '이미지 프로파일'),
					render: (key) =>
						key === 'background' ? (
							<BackgroundPolicyForm focus="profile" />
						) : (
							<TemplateImageProfileManagerForm nodeId={key} />
						),
				},
				transform: {
					title: '이미지 변형',
					render: (nodeId) => <TemplateImageTransformManagerForm nodeId={nodeId} />,
				},
				color: {
					title: '브랜드 컬러',
					render: (controlId) => <TemplateColorManagerForm controlId={controlId} />,
				},
				sample: {
					title: '샘플 이미지',
					render: (sampleId) => <TemplateSampleManagerForm sampleId={sampleId} />,
				},
				export: {
					title: '출력 설정',
					accepts: isTemplateExportAxis,
					render: (axis) =>
						isTemplateExportAxis(axis) ? (
							<TemplateExportManagerForm axis={axis} />
						) : null,
				},
				name: { title: '이름', render: () => <TemplateNameManagerForm /> },
				category: { title: '카테고리', render: () => <TemplateCategoryManagerForm /> },
				defaults: { title: '기본 화면', render: () => <TemplateDefaultsManagerForm /> },
				canvas: { title: 'Figma 원본', render: () => <TemplateCanvasManagerForm /> },
				thumbnail: {
					title: '썸네일',
					render: () => <TemplateThumbnailManagerForm preview={preview} />,
				},
				output: {
					title: '판형',
					render: () => <TemplateOutputManagerForm />,
				},
			}}
		/>
	)
}
