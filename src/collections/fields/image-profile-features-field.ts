import type { Block, Field } from 'payload'
import {
	CAMERA_AZIMUTHS,
	CAMERA_ELEVATIONS,
} from '@/features/image-generation/domain/camera-control'

const AZIMUTH_LABELS: Record<(typeof CAMERA_AZIMUTHS)[number], string> = {
	front: '정면',
	'front-right': '우측 3/4',
	right: '우측면',
	'rear-right': '후면 우측 3/4',
	rear: '후면',
	'rear-left': '후면 좌측 3/4',
	left: '좌측면',
	'front-left': '좌측 3/4',
}

const ELEVATION_LABELS: Record<(typeof CAMERA_ELEVATIONS)[number], string> = {
	low: '로우 앵글',
	'eye-level': '눈높이',
	elevated: '약간 위',
	high: '하이 앵글',
	'top-down': '탑뷰',
}

const featureBlocks: Block[] = [
	{
		slug: 'colorAdjustment',
		interfaceName: 'ImageProfileColorAdjustmentFeature',
		labels: { singular: '색 조정', plural: '색 조정' },
		fields: [
			{
				name: 'background',
				type: 'checkbox',
				defaultValue: false,
				label: '배경 색상 조정',
			},
		],
	},
	{
		slug: 'cameraControl',
		interfaceName: 'ImageProfileCameraControlFeature',
		labels: { singular: '카메라 조정', plural: '카메라 조정' },
		fields: [
			// 구간 목록을 JSON string[]으로 저장한다 — select+hasMany는 값마다 테이블·enum을 만들지만
			// 여기 값은 질의 대상이 아니라 계약 제한이다(exportPolicy의 allowedPpi·allowedFps와 같은 판단).
			{ name: 'azimuths', type: 'json', label: '허용 방향' },
			{ name: 'elevations', type: 'json', label: '허용 높이' },
		],
	},
	{
		slug: 'referenceImage',
		interfaceName: 'ImageProfileReferenceImageFeature',
		labels: { singular: '참조 이미지 첨부', plural: '참조 이미지 첨부' },
		// 첨부는 저장하지 않는 1회용이라 프로파일이 좁힐 세부 설정이 없다 — 켜고 끄는 것이 전부다.
		fields: [],
	},
]

/** Image Profile이 Image Runtime Manifest 지원 범위 안에서 열 feature를 선택하는 필드다.
 *  저장은 blocks 그대로, 렌더는 정본 문법의 토글(On=블록 추가)로 그린다. */
export function imageProfileFeaturesField(): Field {
	return {
		name: 'features',
		type: 'blocks',
		blocks: featureBlocks,
		label: '프로파일 기능',
		admin: {
			components: {
				Field: {
					path: '/components/admin/studio/image-profile-features-field#ImageProfileFeaturesField',
					clientProps: {
						schemaPath: 'image-profiles.features',
						azimuthOptions: CAMERA_AZIMUTHS.map((value) => ({
							value,
							label: AZIMUTH_LABELS[value],
						})),
						elevationOptions: CAMERA_ELEVATIONS.map((value) => ({
							value,
							label: ELEVATION_LABELS[value],
						})),
					},
				},
			},
		},
	}
}
