import type { ControllerWidgetRegistry } from '@/components/studio/panel/studio-panel-slot'
import { TemplateSamplesWidget } from './asset-browser'
import { TemplateImageColorPairWidget } from './color-pair'
import { TemplateSwatchesWidget } from './swatches'
import { TemplateTextFieldWidget } from './text-field'
import { TemplateTransformWidget } from './transform'

/** 텍스트·심볼 레이어(와 배경 Dimming 컴포지션)의 묶음 위젯. */
export const TEMPLATE_LAYER_WIDGETS: ControllerWidgetRegistry = {
	swatches: TemplateSwatchesWidget,
	'text-field': TemplateTextFieldWidget,
}

/** 이미지 대상(슬롯·배경 이미지)의 묶음 위젯 — 모두 컴포지션 `scope`의 대상(`TemplateImageTarget`)을 본다. */
export const TEMPLATE_IMAGE_WIDGETS: ControllerWidgetRegistry = {
	'asset-browser': TemplateSamplesWidget,
	'color-pair': TemplateImageColorPairWidget,
	transform: TemplateTransformWidget,
}
