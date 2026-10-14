import { APIError, type CollectionConfig } from 'payload'
import type { PublishedGraphicProfileDefinition } from '@/features/graphic-generation/domain/graphic-studio-config'
import { managerManagedPublishedAccess } from '@/lib/auth'
import { previewImageField } from './fields/preview-image-field'
import {
	studioControllerPresentationField,
	studioControllerRestrictionsField,
	studioExportPolicyField,
} from './fields/studio-controller-field'
import { draftVersions, keepPublishedOnRestore } from './shared'

/**
 * 캔버스 런타임 프로파일 컬렉션 — 그래픽·그래프 프로파일이 같은 모양이다(런타임 목록·이름만 다르다).
 * 🔴 필드 이름·순서가 곧 DB 스키마다. 한쪽만 바꿀 일이 생기면 그때 이 함수에서 갈라낸다.
 */
export function canvasProfileCollection({
	slug,
	dbName,
	source,
	name,
	runtimeOptions,
	runtimeManifests,
	deriveConfig,
}: {
	slug: string
	dbName: string
	source: 'graphic' | 'graph'
	/** 화면에 보이는 이름 — 「그래픽」·「Graph」. */
	name: string
	runtimeOptions: { value: string; label: string }[]
	runtimeManifests: NonNullable<
		Parameters<typeof studioControllerRestrictionsField>[0]['baseConfigs']
	>
	/** 발행 직전 Controller 계약 검증 — 실패하면 메시지를 담아 던진다. */
	deriveConfig: (profile: PublishedGraphicProfileDefinition) => unknown
}): CollectionConfig {
	const adminRuntimeManifests = runtimeManifests.map(({ artifacts, controller, id }) => ({
		artifacts,
		controller,
		id,
	}))
	return {
		slug,
		dbName,
		access: managerManagedPublishedAccess,
		// runtime이 unique라 프로파일은 runtime당 하나다 — 복제는 매번 고유 제약에 걸려 실패만 한다.
		disableDuplicate: true,
		hooks: {
			beforeChange: [
				keepPublishedOnRestore,
				({ data, originalDoc }) => {
					const effective = { ...originalDoc, ...data }
					if (effective._status !== 'published') return data
					try {
						deriveConfig({
							id: Number(effective.id ?? 0),
							name: String(effective.name ?? ''),
							runtime: String(effective.runtime ?? ''),
							controllerRestrictions: effective.controllerRestrictions,
							controllerPresentation: effective.controllerPresentation,
							exportPolicy: effective.exportPolicy,
						})
					} catch (error) {
						throw new APIError(
							error instanceof Error
								? error.message
								: `${name} Controller 계약을 확인하세요.`,
							400,
						)
					}
					return data
				},
			],
		},
		admin: {
			group: '제작 도구',
			useAsTitle: 'name',
			defaultColumns: ['name', 'runtime', 'displayOrder', '_status', 'updatedAt'],
			description: `등록된 ${name} runtime의 기본 Controller 계약을 좁혀 기본값·선택지·범위·사용 상태를 관리합니다.`,
		},
		defaultSort: 'displayOrder',
		labels: { singular: `${name} 프로파일`, plural: `${name} 프로파일` },
		versions: draftVersions,
		fields: [
			{ name: 'name', type: 'text', required: true, label: '프로파일 이름' },
			{
				name: 'runtime',
				type: 'select',
				required: true,
				unique: true,
				index: true,
				options: runtimeOptions,
				label: `${name} Runtime`,
				admin: {
					description:
						'실행 구현은 코드 registry가 소유합니다. 프로파일은 해당 runtime의 편집 범위만 좁힙니다.',
				},
			},
			previewImageField(),
			{
				name: 'displayOrder',
				type: 'number',
				required: true,
				defaultValue: 0,
				min: 0,
				admin: { position: 'sidebar' },
			},
			studioControllerRestrictionsField({ source, baseConfigs: adminRuntimeManifests }),
			studioControllerPresentationField({ source, baseConfigs: adminRuntimeManifests }),
			studioExportPolicyField({ source, baseConfigs: adminRuntimeManifests }),
		],
	}
}
