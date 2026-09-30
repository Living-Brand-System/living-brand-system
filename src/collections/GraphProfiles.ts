import { APIError, type CollectionConfig } from 'payload'
import {
	deriveGraphStudioConfig,
	GRAPH_RUNTIME_OPTIONS,
	graphRuntimeManifests,
} from '@/features/graph-generation/domain/graph-studio-manifest'
import { managerManagedAccess } from '@/lib/auth'
import { previewImageField } from './fields/preview-image-field'
import {
	studioControllerPresentationField,
	studioControllerRestrictionsField,
	studioExportPolicyField,
} from './fields/studio-controller-field'
import { draftVersions } from './shared'

const graphAdminRuntimeManifests = graphRuntimeManifests.map(({ artifacts, controller, id }) => ({
	artifacts,
	controller,
	id,
}))

export const GraphProfiles: CollectionConfig = {
	slug: 'graph-profiles',
	dbName: 'graph_profiles',
	access: managerManagedAccess,
	hooks: {
		beforeChange: [
			({ data, originalDoc }) => {
				const effective = { ...originalDoc, ...data }
				if (effective._status !== 'published') return data
				try {
					deriveGraphStudioConfig({
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
							: 'Graph Controller 계약을 확인하세요.',
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
		description:
			'등록된 Graph runtime의 기본 Controller 계약을 좁혀 기본값·선택지·범위·사용 상태를 관리합니다.',
	},
	defaultSort: 'displayOrder',
	labels: { singular: 'Graph 프로파일', plural: 'Graph 프로파일' },
	versions: draftVersions,
	fields: [
		{ name: 'name', type: 'text', required: true, label: '프로파일 이름' },
		{
			name: 'runtime',
			type: 'select',
			required: true,
			unique: true,
			index: true,
			options: GRAPH_RUNTIME_OPTIONS,
			label: 'Graph Runtime',
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
		studioControllerRestrictionsField({
			source: 'graph',
			baseConfigs: graphAdminRuntimeManifests,
		}),
		studioControllerPresentationField({
			source: 'graph',
			baseConfigs: graphAdminRuntimeManifests,
		}),
		studioExportPolicyField({
			source: 'graph',
			baseConfigs: graphAdminRuntimeManifests,
		}),
	],
}
