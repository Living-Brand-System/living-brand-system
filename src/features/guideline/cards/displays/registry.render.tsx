import type { ReactNode } from 'react'
import type { DisplayData } from '@/features/guideline/domain/contract/display'
import CiLockupDisplay from '../deprecated/displays/dynamics/ci-lockup/component'
import CiLockupHeroDisplay from '../deprecated/displays/dynamics/ci-lockup-hero/component'
import ClearspaceOverlayDisplay from '../deprecated/displays/dynamics/clearspace-overlay/component'
import ClearspaceViewerDisplay from '../deprecated/displays/dynamics/clearspace-viewer/component'
import HdColorPaletteDisplay from '../deprecated/displays/dynamics/hd-color-palette/component'
import IconGridDisplay from '../deprecated/displays/dynamics/icon-grid/component'
import LayoutGridDisplay from '../deprecated/displays/dynamics/layout-grid/component'
import LayoutGridOverlayDisplay from '../deprecated/displays/dynamics/layout-grid-overlay/component'
import LogoBgPickerDisplay from '../deprecated/displays/dynamics/logo-bg-picker/component'
import LogoDisplayDisplay from '../deprecated/displays/dynamics/logo-display/component'
import LogoOnBackgroundDisplay from '../deprecated/displays/dynamics/logo-on-background/component'
import PresetPanelDisplay from '../deprecated/displays/dynamics/preset-panel/component'
import StemClearSpaceDisplay from '../deprecated/displays/dynamics/stem-clear-space/component'
import TypeHierarchyDisplay from '../deprecated/displays/dynamics/type-hierarchy/component'
import TypeLanguageDisplay from '../deprecated/displays/dynamics/type-language/component'
import TypeSpecimenDisplay from '../deprecated/displays/dynamics/type-specimen/component'
import TypeWeightDisplay from '../deprecated/displays/dynamics/type-weight/component'
import StaticDisplayDisplay from '../deprecated/displays/static/component'
import type { DisplayId } from './registry'

type Row<K extends DisplayId> = Extract<DisplayData, { blockType: K }>
type DisplayComponent<K extends DisplayId> = (props: {
	display: Row<K>
	alt?: string
}) => ReactNode | Promise<ReactNode>

/**
 * 디스플레이 렌더 맵 — id → 폴더의 기본 export 컴포넌트. 컴포넌트는 자기 행(`display`) 하나를 받으므로 여기서
 * props를 풀지 않는다. id가 빠지면 typecheck가 잡는다. `registry.ts`와 파일을 가르는 이유는 그쪽을
 * payload.config가 Node에서 읽기 때문이다.
 */
export const DISPLAY_COMPONENTS = {
	staticDisplay: StaticDisplayDisplay,
	ciLockupHeroWidget: CiLockupHeroDisplay,
	clearspaceOverlayWidget: ClearspaceOverlayDisplay,
	logoBgPickerWidget: LogoBgPickerDisplay,
	logoDisplayWidget: LogoDisplayDisplay,
	typeWeightWidget: TypeWeightDisplay,
	typeSpecimenWidget: TypeSpecimenDisplay,
	layoutGridOverlayWidget: LayoutGridOverlayDisplay,
	ciLockupWidget: CiLockupDisplay,
	clearspaceViewerWidget: ClearspaceViewerDisplay,
	layoutGridWidget: LayoutGridDisplay,
	presetPanelDisplay: PresetPanelDisplay,
	hdColorPaletteWidget: HdColorPaletteDisplay,
	iconGridWidget: IconGridDisplay,
	stemClearSpaceWidget: StemClearSpaceDisplay,
	logoOnBgWidget: LogoOnBackgroundDisplay,
	typeHierarchyWidget: TypeHierarchyDisplay,
	typeLanguageWidget: TypeLanguageDisplay,
} satisfies { [K in DisplayId]: DisplayComponent<K> }

export function renderDisplay(display: DisplayData, context: { alt?: string } = {}): ReactNode {
	if (
		display.blockType === 'typeScrambleWidget' ||
		display.blockType === 'logoColorVariantWidget'
	)
		return null
	const Component = DISPLAY_COMPONENTS[display.blockType] as DisplayComponent<DisplayId>
	return <Component display={display as never} alt={context.alt} />
}
