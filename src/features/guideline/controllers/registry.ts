import type {
	CardController,
	GuidelineControllerManifest,
} from '@/features/guideline/domain/contract/controller'
import type { DisplayData } from '@/features/guideline/domain/contract/display'
import type { StudioControllerRestrictions } from '@/modules/studio-controller/controller-definition'
import {
	CI_LOCKUP_MANIFEST,
	ciLockupRestrictions,
} from '../cards/displays/dynamics/ci-lockup/manifest'
import { CLEARSPACE_VIEWER_MANIFEST } from '../cards/displays/dynamics/clearspace-viewer/manifest'
import {
	LAYOUT_GRID_MANIFEST,
	layoutGridRestrictions,
} from '../cards/displays/dynamics/layout-grid/manifest'
import { LAYOUT_OVERLAY_MANIFEST } from '../cards/displays/dynamics/layout-grid-overlay/manifest'
import { typeHierarchyController } from '../cards/displays/dynamics/type-hierarchy/manifest'
import { typeLanguageController } from '../cards/displays/dynamics/type-language/manifest'
import { TYPE_SPECIMEN_MANIFEST } from '../cards/displays/dynamics/type-specimen/manifest'
import { typeWeightController } from '../cards/displays/dynamics/type-weight/manifest'

type ControllerEntry = {
	manifest: GuidelineControllerManifest
	toRestrictions: (fields: Record<string, unknown>) => StudioControllerRestrictions
	panelOnly?: boolean
}

/** 기존 블록 공유 컨트롤러 연결. 저장값 해석은 각 위젯의 manifest가 소유한다. */
export const GUIDELINE_CONTROLLERS: Readonly<Record<string, ControllerEntry>> = {
	clearspaceViewerWidget: {
		manifest: CLEARSPACE_VIEWER_MANIFEST,
		toRestrictions: () => ({ controls: [] }),
	},
	ciLockupWidget: {
		manifest: CI_LOCKUP_MANIFEST,
		toRestrictions: (fields) => ({ controls: ciLockupRestrictions(fields) }),
	},
	layoutGridControlsWidget: {
		panelOnly: true,
		manifest: LAYOUT_GRID_MANIFEST,
		toRestrictions: layoutGridRestrictions,
	},
}

export function controllerEntryFor(blockType: string): ControllerEntry | undefined {
	return GUIDELINE_CONTROLLERS[blockType]
}

/** 카드별 컨트롤 연결. 도메인 초기값과 제한은 위젯에서 받는다. */
export function cardControllerFor(display: DisplayData): CardController | null {
	switch (display.blockType) {
		case 'ciLockupWidget':
			return {
				manifest: CI_LOCKUP_MANIFEST,
				restrictions: { controls: ciLockupRestrictions({ ...display }) },
			}
		case 'layoutGridOverlayWidget':
			return { manifest: LAYOUT_OVERLAY_MANIFEST }
		case 'typeLanguageWidget':
			return typeLanguageController(display)
		case 'typeHierarchyWidget':
			return typeHierarchyController(display)
		case 'typeSpecimenWidget':
			return { manifest: TYPE_SPECIMEN_MANIFEST }
		case 'typeWeightWidget':
			return typeWeightController(display)
		default:
			return null
	}
}
