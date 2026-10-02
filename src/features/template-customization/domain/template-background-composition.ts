import type { ControllerGroupDefinition } from '@/modules/studio-controller/controller-definition'
import {
	findTemplateControl,
	partitionTemplateSlots,
	type TemplateStudioConfig,
} from './template-studio-config'

/**
 * 배경의 Image Mode(Preset/Generate)를 조건에 쓸 수 있게 컨트롤로 승격한 id(docs/10 §3.7).
 * 🔑 값은 지금처럼 배경 세션(`background.state.imageMode`)이 갖는다 — 발행 config에는 없는 컴포지션 전용 축이다.
 */
export const TEMPLATE_BACKGROUND_IMAGE_MODE_ID = 'background.imageMode'

/**
 * 템플릿 배경의 패널 컴포지션 매니페스트 — 무엇이 있고 서로 어떤 조건으로 보이는지만 선언한다.
 * 자리는 모른다(템플릿 셸의 패널 정책이 정한다).
 *
 * 🔑 컨트롤 정의는 발행 config의 것을 그대로 쓴다 — id·제약·availability가 하나뿐이어야
 *    어드민 제한·에이전트 패치·실행 검증과 화면이 갈리지 않는다.
 * 배경 슬롯이 없거나 방식 컨트롤이 없으면 `null`이다.
 */
export function deriveTemplateBackgroundComposition(
	config: TemplateStudioConfig,
): { groups: ControllerGroupDefinition[] } | null {
	const slot = partitionTemplateSlots(config.template.slots).background
	if (!slot) return null
	const type = findTemplateControl(config, slot.typeControlId)
	if (type?.kind !== 'select') return null
	const color = findTemplateControl(config, slot.colorControlId)
	const dimmer = findTemplateControl(config, slot.dimmerControlId)
	const strength = findTemplateControl(config, slot.dimmerOpacityControlId)
	const image = type.options.some((option) => option.value === 'image')
	return {
		groups: [
			{
				id: 'background-source',
				title: 'Background',
				role: 'source',
				controls: [
					type,
					...(image
						? [
								{
									id: TEMPLATE_BACKGROUND_IMAGE_MODE_ID,
									kind: 'select' as const,
									label: 'Image Mode',
									defaultValue: 'preset',
									variant: 'segmented' as const,
									options: [
										{ value: 'preset', label: 'Preset' },
										{ value: 'generate', label: 'Generate' },
									],
									visibleWhen: { control: type.id, equals: 'image' },
								},
							]
						: []),
				],
			},
			...(color
				? [
						{
							id: 'background-color',
							title: 'Background',
							role: 'palette' as const,
							visibleWhen: { control: type.id, equals: 'color' },
							controls: [color],
						},
					]
				: []),
			// 정책이 디머를 끄면 컨트롤이 config에서 빠진다 — 그룹째 없다.
			...(dimmer && strength
				? [
						{
							id: 'background-dimming',
							title: 'Dimming',
							role: 'overlay' as const,
							controls: [
								dimmer,
								{ ...strength, visibleWhen: { control: dimmer.id, equals: true } },
							],
						},
					]
				: []),
		],
	}
}
