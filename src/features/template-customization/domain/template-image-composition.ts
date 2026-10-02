import type { ControllerCluster } from '@/modules/studio-controller/controller-composition'
import type {
	ControllerControlDefinition,
	ControllerGroupDefinition,
} from '@/modules/studio-controller/controller-definition'
import type { resolveTemplateImageColorControls } from './image-colorize'
import type { ResolvedTemplateImageConfig } from './template-studio-config'

/**
 * 이미지 슬롯(과 배경 이미지)의 세션 축을 조건·묶음에 쓰려고 컨트롤로 승격한 id(docs/10 §3.7).
 * 🔑 값은 지금처럼 슬롯 세션이 갖는다 — 한 번에 한 대상만 편집하므로 대상마다 id를 가르지 않는다.
 */
export const TEMPLATE_IMAGE_IDS = {
	mode: 'image.imageMode',
	dimmer: 'image.dimmer',
	strength: 'image.dimmerOpacity',
} as const

const MODE = {
	id: TEMPLATE_IMAGE_IDS.mode,
	kind: 'select',
	label: 'Mode',
	defaultValue: 'preset',
	variant: 'segmented',
	options: [
		{ value: 'preset', label: 'Preset' },
		{ value: 'generate', label: 'Generate' },
	],
} as const satisfies ControllerControlDefinition

/** 이미지 슬롯의 Dimming(Figma 529:27139). 배경 Dimming과 같은 모양이다. */
export const TEMPLATE_IMAGE_DIMMER = {
	id: TEMPLATE_IMAGE_IDS.dimmer,
	kind: 'toggle',
	label: 'Use',
	defaultValue: false,
} as const satisfies ControllerControlDefinition
export const TEMPLATE_IMAGE_DIMMER_STRENGTH = {
	id: TEMPLATE_IMAGE_IDS.strength,
	kind: 'range',
	label: 'Strength',
	defaultValue: 0.2,
	min: 0,
	max: 0.7,
	step: 0.01,
	display: { precision: 2 },
} as const satisfies ControllerControlDefinition

const generating = { control: TEMPLATE_IMAGE_IDS.mode, equals: 'generate' } as const

/**
 * 템플릿 이미지 대상의 패널 컴포지션 매니페스트 — 무엇이 있고 어떤 방식에서 보이나만 선언한다.
 * 들어오는 것은 화면이 이미 판정한 사실(쓸 수 있는 계약·색 정의·샘플 유무·편집 가능 여부)이다.
 */
export function deriveTemplateImageComposition({
	contract,
	colors,
	readonly,
	dimmer,
	samples,
	transform,
	modeInSettings = false,
}: {
	/** 지금 고른 프로파일의 생성 계약. 없으면 생성 입력이 없다. */
	contract?: ResolvedTemplateImageConfig
	colors: ReturnType<typeof resolveTemplateImageColorControls>
	readonly: boolean
	/** 슬롯 Dimming — 배경은 배경 컴포지션이 따로 세운다. */
	dimmer: boolean
	samples: boolean
	transform: boolean
	/** 방식(Preset/Generate)을 이 컴포지션이 왼쪽 설정 카드(`source`)에 세우나 — 이미지 슬롯. 배경은 배경 컴포지션이 갖는다. */
	modeInSettings?: boolean
}): { groups: ControllerGroupDefinition[]; clusters: ControllerCluster[] } {
	return {
		groups: [
			// 방식은 왼쪽 설정 카드가 고른다. 배경 이미지에서는 조건이 읽는 값으로만 둔다(역할 없음).
			{
				id: 'image-mode',
				title: 'Mode',
				...(modeInSettings ? { role: 'source' as const } : {}),
				controls: [MODE],
			},
			...(dimmer && !readonly
				? [
						{
							id: 'image-dimming',
							title: 'Dimming',
							role: 'overlay' as const,
							controls: [
								TEMPLATE_IMAGE_DIMMER,
								{
									...TEMPLATE_IMAGE_DIMMER_STRENGTH,
									visibleWhen: {
										control: TEMPLATE_IMAGE_IDS.dimmer,
										equals: true,
									},
								},
							],
						},
					]
				: []),
			...(contract && !readonly
				? [
						{
							id: 'generate',
							title: 'Generate',
							role: 'content' as const,
							visibleWhen: generating,
							controls: [contract.prompt],
						},
					]
				: []),
			...(colors
				? [
						{
							id: 'image-color',
							title: 'Color',
							controls: [
								colors.line,
								...(colors.background ? [colors.background] : []),
							],
						},
					]
				: []),
		],
		clusters: [
			...(samples && !readonly
				? [
						{
							id: 'samples',
							title: 'Presets',
							role: 'preset' as const,
							widget: 'asset-browser' as const,
							// 고른 샘플은 슬롯 세션이 갖는다 — 위젯이 세션에서 읽는다.
							members: {},
						},
					]
				: []),
			...(colors
				? [
						{
							id: 'image-color',
							title: 'Color',
							role: 'palette' as const,
							widget: 'color-pair' as const,
							members: {
								foreground: colors.line.id,
								...(colors.background ? { background: colors.background.id } : {}),
							},
						},
					]
				: []),
			...(transform
				? [
						{
							id: 'transform',
							title: 'Image Transform',
							role: 'placement' as const,
							widget: 'transform' as const,
							members: {},
						},
					]
				: []),
		],
	}
}
