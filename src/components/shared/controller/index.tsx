import { ControllerAction } from './action'
import { ControllerAssetCard } from './asset-card'
import { ControllerBar } from './bar'
import { ControllerBrowser } from './browser'
import { ControllerCameraControl } from './camera-control'
import { ControllerCard } from './card'
import { ControllerChips } from './chips'
import { ControllerColorChips } from './color-chips'
import { ControllerColorRow } from './color-row'
import { ControllerColorStrip } from './color-strip'
import { ControllerDataGrid } from './data-grid'
import { ControllerField } from './field'
import { ControllerGroup } from './group'
import { ControllerInput, ControllerTextarea } from './input'
import { ControllerItem } from './item'
import { ControllerContent, ControllerFooter, ControllerHeader, ControllerRoot } from './layout'
import { ControllerListRow } from './list-row'
import { ControllerPad } from './pad'
import { ControllerPadPair } from './pad-pair'
import { ControllerPagination } from './pagination'
import { ControllerPreviewChips } from './preview-chips'
import { ControllerRange } from './range'
import { ControllerRow } from './row'
import { ControllerSegmented } from './segmented'
import { ControllerSelect } from './select'
import { ControllerStatus } from './status'
import { ControllerTabPanel } from './tab-panel'

export type {
	ControllerAvailability,
	ControllerInteraction,
} from '@/modules/studio-controller/controller-definition'

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
 */
export const Controller = {
	Root: ControllerRoot,
	Header: ControllerHeader,
	Content: ControllerContent,
	Group: ControllerGroup,
	Footer: ControllerFooter,
	Row: ControllerRow,
	ListRow: ControllerListRow,
	Field: ControllerField,
	Card: ControllerCard,
	Chips: ControllerChips,
	Item: ControllerItem,
	Segmented: ControllerSegmented,
	TabPanel: ControllerTabPanel,
	ColorChips: ControllerColorChips,
	ColorStrip: ControllerColorStrip,
	ColorRow: ControllerColorRow,
	PreviewChips: ControllerPreviewChips,
	Select: ControllerSelect,
	Input: ControllerInput,
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
	ControllerContent,
	ControllerDataGrid,
	ControllerField,
	ControllerFooter,
	ControllerGroup,
	ControllerHeader,
	ControllerInput,
	ControllerItem,
	ControllerListRow,
	ControllerPad,
	ControllerPadPair,
	ControllerPagination,
	ControllerPreviewChips,
	ControllerRange,
	ControllerRoot,
	ControllerRow,
	ControllerSegmented,
	ControllerSelect,
	ControllerStatus,
	ControllerTabPanel,
	ControllerTextarea,
}
