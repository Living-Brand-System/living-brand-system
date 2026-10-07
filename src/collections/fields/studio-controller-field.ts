import type { Field } from 'payload'
import { STUDIO_OUTPUT_FORMAT_OPTIONS } from '@/features/studio-export/export-contract'
import type {
	StudioKind,
	StudioRuntimeManifest,
} from '@/modules/studio-controller/controller-definition'

type StudioAdminBaseConfig = StudioRuntimeManifest & { id: string }

export function studioControllerRestrictionsField({
	source,
	baseConfigs,
}: {
	source: StudioKind
	baseConfigs?: readonly StudioAdminBaseConfig[]
}): Field {
	return {
		name: 'controllerRestrictions',
		type: 'json',
		label: 'Controller 제한',
		admin: {
			components: {
				Field: {
					path: '/components/admin/studio/studio-controller-restrictions-field#StudioControllerRestrictionsField',
					clientProps: { source, baseConfigs },
				},
			},
		},
	}
}

export function studioControllerPresentationField({
	source,
	baseConfigs,
}: {
	source: StudioKind
	baseConfigs?: readonly StudioAdminBaseConfig[]
}): Field {
	return {
		name: 'controllerPresentation',
		type: 'json',
		label: 'Controller 표현',
		admin: {
			components: {
				Field: {
					path: '/components/admin/studio/studio-controller-restrictions-field#StudioControllerPresentationField',
					clientProps: { source, baseConfigs },
				},
			},
		},
	}
}

/** Exporter 호환 형식을 Admin이 추가하지 않고 좁히기만 하는 정책 필드다. */
export function studioExportPolicyField({
	source,
	baseConfigs,
	includeOriginal = false,
}: {
	source: StudioKind
	baseConfigs?: readonly StudioAdminBaseConfig[]
	includeOriginal?: boolean
}): Field {
	return {
		name: 'exportPolicy',
		type: 'group',
		label: '출력 설정',
		admin: {
			description:
				'형식 칩을 전부 켜면 지원하는 형식을 모두 허용합니다. 전부 끌 수는 없습니다.',
			// 그룹 전체를 정본(76:4) 카드로 그린다 — 하위 필드는 스키마·저장 계약만 소유하고
			// 렌더는 이 컴포넌트가 useField(하위 path)로 직접 잇는다.
			components: {
				Field: {
					path: '/components/admin/studio/studio-export-policy-field#StudioExportPolicyField',
					clientProps: { source, baseConfigs, includeOriginal },
				},
			},
		},
		fields: [
			{
				name: 'allowedFormats',
				type: 'select',
				hasMany: true,
				options: [...STUDIO_OUTPUT_FORMAT_OPTIONS],
				label: '허용 형식',
			},
			{
				name: 'print',
				type: 'group',
				label: '인쇄',
				fields: [
					{
						name: 'allowedPpi',
						type: 'json',
						label: '사용할 인쇄 해상도',
						admin: { description: '전부 켜면 제한을 저장하지 않습니다.' },
					},
				],
			},
			{
				name: 'video',
				type: 'group',
				label: '영상',
				fields: [
					{ name: 'allowedFps', type: 'json', label: '사용할 영상 프레임' },
					// 정본(76:4) 순서: 프레임 → 길이 → 너비·높이.
					{
						name: 'maxDurationSeconds',
						type: 'number',
						min: 0.1,
						label: '최대 영상 길이(초)',
					},
					{ name: 'maxWidth', type: 'number', min: 1, label: '최대 너비' },
					{ name: 'maxHeight', type: 'number', min: 1, label: '최대 높이' },
				],
			},
			...(includeOriginal
				? [
						{
							name: 'original',
							type: 'checkbox' as const,
							defaultValue: true,
							label: '원본 다운로드 허용',
						},
					]
				: []),
		],
	}
}
