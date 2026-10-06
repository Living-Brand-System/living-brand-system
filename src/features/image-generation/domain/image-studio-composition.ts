import type { ControllerCluster } from '@/modules/studio-controller/controller-composition'
import type {
	ControllerControlDefinition,
	ControllerGroupDefinition,
} from '@/modules/studio-controller/controller-definition'
import {
	getImageColorAdjustmentControls,
	getImageStudioControls,
	getImageStudioFeature,
	type ImageStudioConfig,
} from './image-studio-config'

/**
 * 레퍼런스·카메라의 사용(On/Off)을 묶음의 `gate`로 쓰려고 컨트롤로 승격한 id(docs/10 §3.7).
 * 🔑 값은 지금처럼 이미지 세션(`reference.enabled`·`camera.enabled`)이 갖는다 — 발행 config에는 없는 컴포지션 전용 축이다.
 */
export const IMAGE_COMPOSITION_GATE_IDS = {
	reference: 'reference.enabled',
	camera: 'camera.enabled',
} as const

const gate = (id: string, label: string): ControllerControlDefinition => ({
	id,
	kind: 'toggle',
	label,
	defaultValue: false,
})

/**
 * 이미지 스튜디오의 패널 컴포지션 매니페스트 — 무엇이 있고 무엇에 속하나만 선언한다. 자리는 이미지 패널 정책이 정한다.
 * 🔑 컨트롤 정의는 발행 config의 것을 그대로 쓴다(어드민 제한·실행 검증과 화면이 갈리지 않게).
 * 장수·비율·해상도는 Output 카드가 소유한다 — 이 계약 밖이다.
 */
export function deriveImageStudioComposition(config: ImageStudioConfig): {
	groups: ControllerGroupDefinition[]
	clusters: ControllerCluster[]
} {
	const { prompt } = getImageStudioControls(config)
	const color = getImageColorAdjustmentControls(config)
	const reference = Boolean(getImageStudioFeature(config, 'reference-image'))
	const camera = Boolean(getImageStudioFeature(config, 'camera-control'))
	return {
		groups: [
			{
				id: 'generate',
				title: 'Generate',
				role: 'content',
				controls: [
					prompt,
					...(reference
						? [gate(IMAGE_COMPOSITION_GATE_IDS.reference, 'Reference Image')]
						: []),
				],
			},
			// 색·카메라 멤버는 묶음이 그린다 — 그룹은 정의를 담을 뿐 행으로 서지 않는다.
			...(color
				? [
						{
							id: 'color',
							title: 'Color',
							controls: [color.line, ...(color.background ? [color.background] : [])],
						},
					]
				: []),
			...(camera
				? [
						{
							id: 'camera',
							title: 'Camera Control',
							controls: [gate(IMAGE_COMPOSITION_GATE_IDS.camera, 'Camera Control')],
						},
					]
				: []),
		],
		clusters: [
			// Figma 529:19999 — Reference Image는 Generate 그룹 안, Prompt 아래에 선다.
			...(reference
				? [
						{
							id: 'reference',
							title: 'Reference Image',
							role: 'source' as const,
							widget: 'reference' as const,
							group: 'generate',
							members: { gate: IMAGE_COMPOSITION_GATE_IDS.reference },
						},
					]
				: []),
			...(color
				? [
						{
							id: 'color',
							title: 'Color',
							role: 'palette' as const,
							widget: 'color-pair' as const,
							members: {
								foreground: color.line.id,
								...(color.background ? { background: color.background.id } : {}),
							},
						},
					]
				: []),
			...(camera
				? [
						{
							id: 'camera',
							title: 'Camera Control',
							role: 'view' as const,
							widget: 'camera' as const,
							members: { gate: IMAGE_COMPOSITION_GATE_IDS.camera },
						},
					]
				: []),
		],
	}
}
