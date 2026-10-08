import type { TemplateImageSlotState } from '@/features/template-customization/contexts/template-studio-context'
import type { SampleImageOption } from '@/features/template-customization/domain/sample-image-option'
import type {
	ResolvedTemplateImageConfig,
	TemplateImageConfigSlot,
} from '@/features/template-customization/domain/template-studio-config'
import type {
	ControllerControlValue,
	ControllerRuntimeBindings,
} from '@/modules/studio-controller/controller-definition'

/** 템플릿 이미지 위젯의 `scope` — 지금 편집하는 이미지 대상(슬롯 또는 배경)과 그 세션 액션. */
export type TemplateImageTarget = {
	id: string
	label: string
	state: TemplateImageSlotState
	contracts: readonly ResolvedTemplateImageConfig[]
	readonly: boolean
	pinned: boolean
	bindings: ControllerRuntimeBindings
	onProfile: (id: number) => void
	onPrompt: (value: string) => void
	onDimmer: (patch: { dimmer?: boolean; dimmerOpacity?: number }) => void
	onFeature: (id: string, value: ControllerControlValue) => void
	onSample: (option: SampleImageOption) => void
	onGenerate: () => void
	/** 슬롯 방식(Preset/Generate) — 배경 방식은 배경 컴포지션이 갖는다(없음). */
	onMode?: (mode: 'preset' | 'generate') => void
	/** 슬롯 Transform — 배경에는 없다. */
	transform?: {
		limits: TemplateImageConfigSlot['transform']['limits']
		aspectRatio?: number
		onChange: (transform: NonNullable<TemplateImageSlotState['transform']>) => void
	}
}

/**
 * 이미지 묶음 위젯은 편집 대상(슬롯·배경) 하나를 본다 — 컴포지션의 `scope`로 받는다.
 * 본문(샘플·색·Transform)의 값은 대상 세션이 갖는다.
 */
export function imageTarget(scope: unknown): TemplateImageTarget {
	if (!scope)
		throw new Error('이미지 위젯은 템플릿 이미지 컴포지션(scope = 대상) 안에서만 그린다.')
	return scope as TemplateImageTarget
}
