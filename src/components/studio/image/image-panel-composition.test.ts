import { describe, expect, it } from 'vitest'
import { deriveImageStudioComposition } from '@/features/image-generation/domain/image-studio-composition'
import {
	deriveImageStudioConfig,
	type PublishedImageProfileDefinition,
} from '@/features/image-generation/domain/image-studio-config'
import {
	arrangeStudioPanel,
	type StudioPanelEntry,
} from '@/modules/studio-controller/controller-composition'
import { IMAGE_PANEL_POLICY } from './image-controls'

const profile: PublishedImageProfileDefinition = {
	id: 5,
	name: '브랜드 제품컷',
	slug: 'brand-product',
	imageModelPreset: 'openai-gpt-image-2',
}

const shape = (entries: readonly StudioPanelEntry[]) =>
	entries.map((entry) =>
		entry.type === 'group'
			? {
					group: entry.group.id,
					controls: entry.group.controls.map((control) => control.id),
					clusters: entry.clusters?.map((nested) => nested.cluster.id) ?? [],
				}
			: { cluster: entry.cluster.id },
	)

describe('이미지 패널 컴포지션', () => {
	it('Basic은 Generate(프롬프트 + 그 안의 Reference Image), Adjustment는 색 → 카메라다', () => {
		const config = deriveImageStudioConfig({
			...profile,
			features: [
				{ blockType: 'referenceImage' },
				{ blockType: 'colorAdjustment', background: true },
				{ blockType: 'cameraControl' },
			],
		})
		const slots = arrangeStudioPanel(
			deriveImageStudioComposition(config),
			IMAGE_PANEL_POLICY,
			{},
		)
		// 사용(On/Off) 게이트는 묶음이 그리므로 그룹 행으로 서지 않는다.
		expect(shape(slots.basic)).toEqual([
			{ group: 'generate', controls: ['prompt'], clusters: ['reference'] },
		])
		expect(shape(slots.adjustment)).toEqual([{ cluster: 'color' }, { cluster: 'camera' }])
	})

	it('기능을 열지 않은 프로파일은 프롬프트만 서고 Adjustment가 비어 탭이 없다', () => {
		const config = deriveImageStudioConfig({ ...profile, features: [] })
		const slots = arrangeStudioPanel(
			deriveImageStudioComposition(config),
			IMAGE_PANEL_POLICY,
			{},
		)
		expect(shape(slots.basic)).toEqual([
			{ group: 'generate', controls: ['prompt'], clusters: [] },
		])
		expect(slots.adjustment).toEqual([])
	})
})
