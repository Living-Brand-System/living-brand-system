import type { GuidelineControllerManifest } from '@/features/guideline/domain/contract/controller'

// 원본 좌표에서 조절한다. 표시 영역의 너비·높이는 카드가 소유한다.
export const OVERLAY_CONTROLS = [
	{ id: 'sections', kind: 'range', label: '섹션 수', defaultValue: 3, min: 1, max: 12, step: 1 },
	{ id: 'columns', kind: 'range', label: '열 수', defaultValue: 4, min: 1, max: 12, step: 1 },
	{
		id: 'padding',
		kind: 'range',
		label: '패딩',
		defaultValue: 24,
		min: 0,
		max: 120,
		step: 1,
		display: { unit: 'px' },
	},
	{
		id: 'gap',
		kind: 'range',
		label: '갭',
		defaultValue: 16,
		min: 0,
		max: 120,
		step: 1,
		display: { unit: 'px' },
	},
	{ id: 'guidesOn', kind: 'toggle', label: '가이드', defaultValue: true },
] as const
export const LAYOUT_OVERLAY_MANIFEST = {
	id: 'layout-grid-overlay',
	groups: [{ id: 'grid', title: '격자', controls: OVERLAY_CONTROLS }],
} satisfies GuidelineControllerManifest
