import { describe, expect, it } from 'vitest'
import {
	deriveTemplateImageComposition,
	TEMPLATE_IMAGE_IDS,
} from '@/features/template-customization/domain/template-image-composition'
import type { ResolvedTemplateImageConfig } from '@/features/template-customization/domain/template-studio-config'
import {
	arrangeStudioPanel,
	type StudioPanelEntry,
} from '@/modules/studio-controller/controller-composition'
import { templateImagePanelPolicy } from './template-media-controls'

// 컴포지션이 계약에서 읽는 것은 프롬프트 정의뿐이다.
const contract = {
	prompt: { id: 'prompt', kind: 'text', label: 'Prompt', defaultValue: '' },
} as unknown as ResolvedTemplateImageConfig

const ids = (entries: readonly StudioPanelEntry[]) =>
	entries.map((entry) =>
		entry.type === 'group'
			? `${entry.group.id}(${entry.group.controls.map((control) => control.id).join(',')})`
			: entry.cluster.id,
	)

const arrange = (
	mode: 'preset' | 'generate',
	dimmer = false,
	layer: 'base' | 'floating' = 'floating',
) =>
	arrangeStudioPanel(
		deriveTemplateImageComposition({
			contract,
			colors: null,
			readonly: false,
			dimmer: true,
			samples: true,
			transform: true,
		}),
		templateImagePanelPolicy(mode === 'generate', layer),
		{ [TEMPLATE_IMAGE_IDS.mode]: mode, [TEMPLATE_IMAGE_IDS.dimmer]: dimmer },
	)

describe('템플릿 이미지 컴포지션', () => {
	it('Preset은 샘플 목록이 Basic 위 목록 카드이고 생성 입력이 없다(Figma 529:26114)', () => {
		const slots = arrange('preset')
		expect(ids(slots.basicPresets)).toEqual(['samples'])
		expect(slots.basic).toEqual([])
		expect(slots.presets).toEqual([])
		// 이동/확대/회전은 프로파일 값이 아니라 기본 층에 선다.
		expect(slots.adjustment).toEqual([])
		expect(ids(arrange('preset', false, 'base').adjustment)).toEqual(['transform'])
	})

	it('Generate는 프롬프트가 Basic을 차지하고 샘플은 Presets 탭으로 비킨다(Figma 529:27139)', () => {
		const slots = arrange('generate')
		expect(ids(slots.basic)).toEqual(['generate(prompt)'])
		expect(ids(slots.presets)).toEqual(['samples'])
		expect(slots.basicPresets).toEqual([])
	})

	it('Dimming은 기본 층에 방식과 무관하게 서고, Use가 켜지면 Strength가 선다', () => {
		expect(arrange('preset').fixed).toEqual([])
		expect(ids(arrange('preset', false, 'base').fixed)).toEqual(['image-dimming(image.dimmer)'])
		expect(ids(arrange('generate', true, 'base').fixed)).toEqual([
			'image-dimming(image.dimmer,image.dimmerOpacity)',
		])
	})
})
