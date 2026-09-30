import type { Block } from 'payload'
import { type DisplayDefinition, displaySchema } from './definition'
import { ciLockup } from './dynamics/ci-lockup/definition'
import { ciLockupHero } from './dynamics/ci-lockup-hero/definition'
import { clearspaceOverlay } from './dynamics/clearspace-overlay/definition'
import { clearspaceViewer } from './dynamics/clearspace-viewer/definition'
import { hdColorPalette } from './dynamics/hd-color-palette/definition'
import { iconGrid } from './dynamics/icon-grid/definition'
import { layoutGrid } from './dynamics/layout-grid/definition'
import { layoutGridOverlay } from './dynamics/layout-grid-overlay/definition'
import { logoBgPicker } from './dynamics/logo-bg-picker/definition'
import { logoColorVariant } from './dynamics/logo-color-variant/definition'
import { logoDisplay } from './dynamics/logo-display/definition'
import { logoOnBackground } from './dynamics/logo-on-background/definition'
import { presetPanel } from './dynamics/preset-panel/definition'
import { stemClearSpace } from './dynamics/stem-clear-space/definition'
import { typeHierarchy } from './dynamics/type-hierarchy/definition'
import { typeLanguage } from './dynamics/type-language/definition'
import { typeScramble } from './dynamics/type-scramble/definition'
import { typeSpecimen } from './dynamics/type-specimen/definition'
import { typeWeight } from './dynamics/type-weight/definition'
import { staticDisplay } from './static/definition'

/** 기존 CMS 콘텐츠의 렌더 호환 목록. 저장 블록 순서는 전체 마이그레이션까지 유지한다.
 * payload.config가 읽으므로 React·조회 코드를 넣지 않는다.
 */
export const LEGACY_RENDERABLE_DISPLAYS = [
	staticDisplay,
	ciLockupHero,
	clearspaceOverlay,
	logoBgPicker,
	logoDisplay,
	typeWeight,
	typeSpecimen,
	layoutGridOverlay,
	ciLockup,
	clearspaceViewer,
	layoutGrid,
	presetPanel,
	hdColorPalette,
	iconGrid,
	stemClearSpace,
	logoOnBackground,
	typeHierarchy,
	typeLanguage,
] as const satisfies readonly DisplayDefinition[]

/** 신규 독립 타입으로 제공하지 않는다. 기존 문서의 표현은 전체 이관까지 유지한다. */
export const CONSOLIDATED_DISPLAY_IDS = [
	'stemClearSpaceWidget',
	'logoDisplayWidget',
	'clearspaceViewerWidget',
	'typeLanguageWidget',
	'typeHierarchyWidget',
	'iconGridWidget',
	'presetPanelDisplay',
] as const

export type DisplayId = (typeof LEGACY_RENDERABLE_DISPLAYS)[number]['id']

/** 신규 카드의 선택 목록. 구형 저장 데이터의 해석 목록과 분리한다. */
export const DISPLAYS = LEGACY_RENDERABLE_DISPLAYS.filter(
	(entry) => !CONSOLIDATED_DISPLAY_IDS.some((id) => id === entry.id),
)

/** 카드 `display` 필드가 받는 Payload Block 목록. */
// 폐기된 위젯은 기존 문서·버전의 저장 호환에만 남긴다.
export const displayBlocks: Block[] = [
	...LEGACY_RENDERABLE_DISPLAYS,
	typeScramble,
	logoColorVariant,
].map(displaySchema)

/** 정적 메타데이터만 소비하고 Payload 필드나 렌더 함수를 클라이언트에 넘기지 않는다. */
export function displayDefinition(id: DisplayId) {
	const definition = LEGACY_RENDERABLE_DISPLAYS.find((entry) => entry.id === id)
	if (!definition) throw new Error(`등록되지 않은 디스플레이: ${id}`)
	return definition
}
