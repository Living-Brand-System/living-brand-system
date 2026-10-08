import type { ControllerWidgetRegistry } from '@/components/studio/panel/studio-panel-slot'
import { ColorPairWidget } from '@/components/studio/shared/widgets/color-pair'
import { ImageCameraWidget } from './camera'
import { ImageReferenceWidget } from './reference'

/** 이미지 묶음 위젯 — 본문(첨부·시드 이미지·각도)은 이미지 세션이 갖고, 사용 여부만 계약 값으로 오간다. */
export const IMAGE_WIDGETS: ControllerWidgetRegistry = {
	'color-pair': ColorPairWidget,
	reference: ImageReferenceWidget,
	camera: ImageCameraWidget,
}
