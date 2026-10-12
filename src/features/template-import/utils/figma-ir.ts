/**
 * Figma 변환 파이프라인의 공유 어휘.
 *
 * FigmaSourceNode(소스 모델) → IrNode(중간 표현) → HTML 문자열 순서로 흐른다.
 * - 소스 모델: REST /nodes 응답에서 변환이 소비하는 필드의 실질적 명세. 레거시/신형 필드가 섞여 있다.
 * - IR: "무엇을 어떤 태그·스타일로 그릴지" 판단이 끝난 상태. 방출(emit)은 IR을 기계적으로 문자열화만 한다.
 * 이 파일은 타입만 소유한다 — 로직은 normalize(판단)·lower(스타일 변환)·emit(방출)이 나눠 갖는다.
 */

export interface FigmaLayoutConstraint {
	horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE'
	vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE'
}

export interface FigmaPaint {
	type: string
	visible?: boolean
	opacity?: number
	color?: { r: number; g: number; b: number; a?: number }
	gradientStops?: { color: { r: number; g: number; b: number; a?: number }; position?: number }[]
	gradientHandlePositions?: { x: number; y: number }[]
	/** IMAGE paint의 파일 내 이미지 참조 — GET /v1/files/:key/images로 URL을 얻는다. */
	imageRef?: string
	/** IMAGE paint의 맞춤 방식: FILL/FIT/TILE/STRETCH. */
	scaleMode?: string
}

export interface FigmaEffect {
	type: string
	visible?: boolean
	radius?: number
	spread?: number
	offset?: { x: number; y: number }
	color?: { r: number; g: number; b: number; a?: number }
}

/** 텍스트 노드 style 필드 — REST 응답의 타이포 필드 중 변환이 읽는 것들. */
export interface FigmaTextStyle {
	fontFamily?: string
	fontSize?: number
	fontWeight?: number
	/** PostScript 이름(예: HDOTF-Bd). 웨이트를 이름으로만 나르는 폰트에서 웨이트 복원의 폴백. */
	fontPostScriptName?: string
	lineHeightPx?: number
	letterSpacing?: number
	textAlignHorizontal?: string
	textAlignVertical?: string
	textAutoResize?: string
	italic?: boolean
	fontStyle?: string
	textCase?: string
	textDecoration?: string
	lineHeightUnit?: string
	lineHeightPercentFontSize?: number
	/** 말줄임 여부: 'DISABLED' | 'ENDING'. 레거시 textAutoResize 'TRUNCATE'가 ENDING과 같은 뜻. */
	textTruncation?: string
	/** textTruncation ENDING일 때 잘리기 전까지 허용하는 최대 줄 수. */
	maxLines?: number
}

/** 소스 모델: REST /nodes 응답에서 변환이 소비하는 필드의 실질적 명세. 트리 전체가 이 타입으로 흐른다. */
export interface FigmaSourceNode {
	id: string
	name?: string
	type: string
	visible?: boolean
	isMask?: boolean
	children?: FigmaSourceNode[]
	absoluteBoundingBox?: { x: number; y: number; width: number; height: number }
	/** HasLayoutTrait.size는 폭/높이를 x/y에 담는 REST Vector다. */
	size?: { x: number; y: number }
	relativeTransform?: [[number, number, number], [number, number, number]]
	constraints?: FigmaLayoutConstraint
	characters?: string
	style?: FigmaTextStyle
	// 시각 속성
	fills?: FigmaPaint[]
	background?: FigmaPaint[]
	backgroundColor?: { r: number; g: number; b: number; a?: number }
	strokes?: FigmaPaint[]
	strokeWeight?: number
	individualStrokeWeights?: { top: number; right: number; bottom: number; left: number }
	effects?: FigmaEffect[]
	cornerRadius?: number
	rectangleCornerRadii?: number[]
	opacity?: number
	rotation?: number
	blendMode?: string
	clipsContent?: boolean
	// 레이아웃 컨테이너
	layoutMode?: string
	itemSpacing?: number
	counterAxisSpacing?: number
	counterAxisAlignContent?: string
	layoutWrap?: string
	paddingTop?: number
	paddingRight?: number
	paddingBottom?: number
	paddingLeft?: number
	primaryAxisAlignItems?: string
	counterAxisAlignItems?: string
	gridColumnGap?: number
	gridRowGap?: number
	gridColumnsSizing?: string
	gridRowsSizing?: string
	gridItemsPositioning?: string
	// 자식 배치
	layoutSizingHorizontal?: 'FIXED' | 'HUG' | 'FILL'
	layoutSizingVertical?: 'FIXED' | 'HUG' | 'FILL'
	layoutGrow?: 0 | 1
	layoutAlign?: 'INHERIT' | 'STRETCH' | 'MIN' | 'CENTER' | 'MAX'
	layoutPositioning?: 'AUTO' | 'ABSOLUTE'
	gridColumnAnchorIndex?: number
	gridRowAnchorIndex?: number
	gridColumnSpan?: number
	gridRowSpan?: number
	gridChildHorizontalAlign?: string
	gridChildVerticalAlign?: string
}

/** CSS 선언 묶음. 값이 undefined/빈 문자열인 키는 방출 시 걸러진다. */
export type IrCssStyle = Record<string, string | undefined>

/**
 * 노드를 대신 그리는 에셋 참조. img 태그의 src와 data-asset-* 속성이 된다.
 * application-images는 Figma 렌더 API로 구워 저장한 것, brand-logos는 로고 인식이 고른 등록 로고다.
 */
export interface FigmaRenderedAsset {
	collection: 'application-images' | 'brand-logos'
	id: number
	url: string
}

/**
 * 중간 표현 노드. normalize가 모든 판단(태그 선택, 스타일 병합, 비가시 노드 제거)을 끝낸 결과라서
 * emit은 이 트리를 문자열로 옮기기만 하면 된다.
 * - tag 'img'(렌더 에셋)면 children은 항상 비어 있고 asset이 존재한다.
 * - tag 'p'(텍스트)면 text가 내용을 담는다(이스케이프 전 원문).
 */
export interface IrNode {
	id: string
	name: string
	figmaType: string
	tag: 'div' | 'p' | 'img'
	style: IrCssStyle
	text?: string
	asset?: FigmaRenderedAsset
	/** IMAGE fill을 background-image로 낮춘 노드의 에셋 참조 — div에 data-asset-* 속성으로 방출돼 발행 승격 대상이 된다. */
	fillAsset?: FigmaRenderedAsset
	/** 이미지 배정 가능한 표면(클립 프레임의 외동 이미지 자식·자식 없는 이미지 fill·래스터 폴백 img) — data-image-carrier로 방출되며 compose의 이미지 배정은 캐리어 전용이다. */
	imageCarrier?: true
	children: IrNode[]
}
