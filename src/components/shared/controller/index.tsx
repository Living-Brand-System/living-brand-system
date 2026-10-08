import { ControllerAssetCard } from './asset/asset-card'
import { ControllerBrowser } from './asset/browser'
import { ControllerAction } from './compose/action'
import { ControllerCompound } from './compose/compound'
import { ControllerField } from './compose/field'
import { ControllerRow } from './compose/row'
import { ControllerStack } from './compose/stack'
import { ControllerCameraControl } from './controls/camera-control'
import { ControllerChips } from './controls/chips'
import { ControllerColorChips } from './controls/color-chips'
import { ControllerColorRow } from './controls/color-row'
import { ControllerColorStrip } from './controls/color-strip'
import { ControllerDataGrid } from './controls/data-grid'
import { ControllerInput, ControllerTextarea } from './controls/input'
import { ControllerNumberInput } from './controls/number-input'
import { ControllerPad } from './controls/pad'
import { ControllerPadPair } from './controls/pad-pair'
import { ControllerPreviewChips } from './controls/preview-chips'
import { ControllerRange } from './controls/range'
import { CONTROLLER_TOGGLE_OPTIONS, ControllerSegmented } from './controls/segmented'
import { ControllerSelect } from './controls/select'
import { ControllerSwatch } from './controls/swatch'
import { ControllerBar } from './layout/bar'
import { ControllerGroup } from './layout/group'
import { ControllerGroupList } from './layout/group-list'
import {
	ControllerContent,
	ControllerFooter,
	ControllerHeader,
	ControllerRoot,
} from './layout/layout'
import { ControllerPresence, ControllerReveal } from './layout/presence'
import { ControllerTabPanel } from './layout/tab-panel'
import { ControllerCard } from './read/card'
import { ControllerItem } from './read/item'
import { ControllerListRow } from './read/list-row'
import { ControllerPagination } from './read/pagination'
import { ControllerStatus } from './read/status'

export type {
	ControllerAvailability,
	ControllerInteraction,
} from '@/modules/studio-controller/controller-definition'
export { snapCameraAngle } from './controls/camera-orbit'
export type { ControllerGroupSectionProps } from './layout/group'

/**
 * 컨트롤러 킷 — 디자인 SSOT(Figma HD_LBS_UI 4:5578 "Controller API")의 dialkit 기반
 * 패널 언어(36px 행·muted 채움·접이식 섹션)를 Creator UI 토큰으로 옮긴 컴파운드 세트.
 * 템플릿 컨트롤러가 첫 소비자였고, 지금은 **스튜디오와 가이드라인이 함께 쓴다** —
 * 그래서 자리가 `components/studio/`가 아니라 `components/shared/`다.
 * 상태 계약(readonly·disabled·isEmpty·counter)의 정본은 docs/10 §3.6.
 *
 * 표현 컨텍스트: Row/Field가 { controlId, disabled }를 내려 안의 킷 컨트롤
 * (Select·Input·Textarea·Segmented·ColorRow 스와치)이 라벨 연결과 비활성을 자동으로 잇는다.
 * 도메인 상태 컨텍스트는 여기 두지 않는다 — Provider가 필요하면 features의 훅으로(docs/10 §3.5).
 *
 * 폴더는 역할이다 — layout(패널·그룹 골격과 펼침) · controls(값을 바꾸는 리프) · compose(라벨 행·
 * 묶음 표면) · read(값을 보여주기만 하는 파츠) · asset(자산 브라우저) · internal(킷 안에서만 쓰는 도구).
 * 🔴 킷 밖에서는 이 index로만 import한다. 예외는 `controls/camera-orbit-control` 하나 — 3D 모듈이라
 *    `dynamic()`으로 따로 불러야 index에 섞이지 않는다.
 */
export const Controller = {
	Root: ControllerRoot,
	Header: ControllerHeader,
	Content: ControllerContent,
	Group: ControllerGroup,
	GroupList: ControllerGroupList,
	Footer: ControllerFooter,
	Row: ControllerRow,
	Stack: ControllerStack,
	Compound: ControllerCompound,
	ListRow: ControllerListRow,
	Field: ControllerField,
	Card: ControllerCard,
	Chips: ControllerChips,
	Item: ControllerItem,
	Segmented: ControllerSegmented,
	TabPanel: ControllerTabPanel,
	Reveal: ControllerReveal,
	Presence: ControllerPresence,
	ColorChips: ControllerColorChips,
	ColorStrip: ControllerColorStrip,
	ColorRow: ControllerColorRow,
	PreviewChips: ControllerPreviewChips,
	Select: ControllerSelect,
	Swatch: ControllerSwatch,
	Input: ControllerInput,
	NumberInput: ControllerNumberInput,
	Textarea: ControllerTextarea,
	Range: ControllerRange,
	Pad: ControllerPad,
	PadPair: ControllerPadPair,
	Pagination: ControllerPagination,
	Action: ControllerAction,
	DataGrid: ControllerDataGrid,
	Status: ControllerStatus,
	Bar: ControllerBar,
	CameraControl: ControllerCameraControl,
	Browser: ControllerBrowser,
	AssetCard: ControllerAssetCard,
}

// RSC에서 네임스페이스 객체의 점 접근은 client reference 제약으로 깨질 수 있다 — 개별 export가 안전판.
export {
	CONTROLLER_TOGGLE_OPTIONS,
	ControllerAction,
	ControllerAssetCard,
	ControllerBar,
	ControllerBrowser,
	ControllerCameraControl,
	ControllerCard,
	ControllerChips,
	ControllerColorChips,
	ControllerColorRow,
	ControllerColorStrip,
	ControllerCompound,
	ControllerContent,
	ControllerDataGrid,
	ControllerField,
	ControllerFooter,
	ControllerGroup,
	ControllerGroupList,
	ControllerHeader,
	ControllerInput,
	ControllerItem,
	ControllerListRow,
	ControllerNumberInput,
	ControllerPad,
	ControllerPadPair,
	ControllerPagination,
	ControllerPresence,
	ControllerPreviewChips,
	ControllerRange,
	ControllerReveal,
	ControllerRoot,
	ControllerRow,
	ControllerSegmented,
	ControllerSelect,
	ControllerStack,
	ControllerStatus,
	ControllerSwatch,
	ControllerTabPanel,
	ControllerTextarea,
}
