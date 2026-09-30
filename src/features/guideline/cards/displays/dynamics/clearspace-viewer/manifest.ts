import type { GuidelineControllerManifest } from '@/features/guideline/domain/contract/controller'
import type { ControllerControlDefinition } from '@/modules/studio-controller/controller-definition'

// 이 위젯이 여는 컨트롤. 🔴 react·에셋을 import하지 않는다 — `schema.ts`가 읽을 수 있어야 한다.

/**
 * 로고 표시 배율. 100%가 규정 크기이고 줄일수록 최소 크기 규정에 가까워진다 —
 * 금지 구간에 들어가면 위젯이 채움·수치·캡션으로 따로 말한다(그 판정은 위젯이 갖는다).
 */
export const SCALE = {
	id: 'clearspaceScale',
	kind: 'range',
	label: '표시 배율',
	defaultValue: 100,
	min: 10,
	max: 100,
	step: 1,
	display: { unit: '%' },
} as const satisfies ControllerControlDefinition

export const CLEARSPACE_VIEWER_MANIFEST = {
	id: 'clearspace-viewer',
	groups: [{ id: 'scale', title: '배율', controls: [SCALE] }],
} as const satisfies GuidelineControllerManifest
