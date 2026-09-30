import type {
	AuthorizedTemplateAssetCollection,
	TemplateVectorAssetCollection,
} from '@/features/template-core/domain/template-asset-policy'

/** Creator가 편집할 수 있는 텍스트 슬롯의 제약과 작성 지침. */
export interface TemplateSlotSpec {
	label?: string
	placeholder?: string
	maxLength?: number
	maxLines?: number
	inputFormat?: 'free' | 'number' | 'email' | 'date'
	aiInstruction?: string
}

export type TemplateLayerAccess = 'hidden' | 'readonly' | 'editable'

export interface TemplateLayerCreatorPolicy {
	access: TemplateLayerAccess
	visibility?: {
		defaultVisible?: boolean
		allowToggle?: boolean
	}
}

/** Template의 nodeId 하나에 저장하는 앱 편집 설정. */
export interface TemplateNodeConfig {
	/** Admin이 정하는 Creator 노출·편집·visibility 정책. */
	creator?: TemplateLayerCreatorPolicy
	/**
	 * 이 노드의 **자식 겹침 순서** — Admin이 정하는 정본이다(2026-09-10).
	 * 값은 자식 nodeId를 **문서 순서(= 아래 → 위)**로 나열한 것이고 compose가 DOM을 그 순서로
	 * 재배치한다.
	 *
	 * 🔴 **z-index를 쓰지 않는 이유**: 벡터 내보내기가 DOM 순서로만 걷고 z-index를 읽지 않는다
	 *    (`template-dom-to-vector-scene.client.ts`). 정본을 DOM 순서 하나로 두면 화면·PDF·SVG가
	 *    갈릴 수 없다.
	 * 🔴 **형제 안에서만** 순서가 성립한다. 다른 부모로 옮기면 `position: absolute`의 좌표 기준이
	 *    바뀌어 위치가 깨지므로 재배치는 같은 부모 안에서만 한다.
	 * 🔴 목록에 없는 자식은 **제 자리를 지킨다.** 목록이 이름 댄 자식들이 지금 차지한 자리에만 그
	 *    순서가 채워진다 — 재import로 새로 생긴 노드가 Figma가 놓은 자리에 그대로 남는다.
	 *    (끝으로 쓸어 보내면 그 노드가 다른 레이어에 가려지거나 위를 덮는다.)
	 */
	childOrder?: string[]
	/**
	 * 레이어 이름 — **Admin이 정하는 정본**이다(사용자 지시, 2026-09-10). compose가 이 값을 노드의
	 * `data-name`에 쓴다.
	 *
	 * 🔑 `data-name` **한 자리**로 모으는 이유: 스튜디오 레이어 패널·Admin 레이어 목록·**인쇄
	 *    PDF의 Illustrator 레이어명**이 전부 그것을 읽는다
	 *    (`template-dom-to-vector-scene.client.ts`의 group label → PDF OCG). 새 필드를 따로
	 *    내려보내면 셋 중 하나가 조용히 Figma 이름에 머문다.
	 * 🔴 비어 있으면 Figma가 준 `data-name`이 그대로 남는다 — 초안은 Figma, 수정은 Admin이다.
	 */
	label?: string
	/** Creator 세션이 compose에만 싣는 실제 표시 상태. Admin 저장 정책과 분리한다. */
	visible?: boolean
	text?: string
	/** 텍스트 노드(<p>)의 색 오버라이드 — 스튜디오 일괄 텍스트 색이 compose 시점에만 싣는 값(저장 안 됨). */
	color?: string
	backgroundImage?: string
	/** Admin이 노드에 붙여 저장하는 생성 이미지 참조. 저장 검증이 발행 조건으로 요구한다. */
	generatedImageId?: number
	/**
	 * Creator 세션이 compose에만 싣는 자산 참조(저장 안 됨). 생성 이미지든 샘플 이미지든
	 * 같은 자리를 쓴다 — 컬렉션이 값에 들어 있어 출처가 늘어도 이 계약은 그대로다.
	 * 없으면 compose가 generatedImageId로 물러난다.
	 */
	assetRef?: { collection: AuthorizedTemplateAssetCollection; id: number }
	/** 프레임에 할당한 이미지의 자유 편집 — 이동(px)·확대(배율)·회전(deg). 캐리어에만 적용된다. */
	imageTransform?: { x: number; y: number; scale: number; rotate: number }
	/**
	 * 생성 이미지(단색 라인 아트)의 브랜드 컬러 치환 — 이미지가 luminance 마스크가 되어
	 * 밝은 영역=background, 어두운 선=line으로 칠해진다. 기존 이미지와 교체 이미지에 모두 적용된다.
	 * background 생략 = 배경 투명(선만 칠해지고 캔버스가 비침).
	 */
	imageColorize?: { line: string; background?: string }
	input?: TemplateSlotSpec
	/**
	 * 존재 자체가 스튜디오 개방 선언 — 유저가 이 프레임의 이미지를 생성해 채울 수 있다.
	 * profileId는 사용할 프로파일 고정(없으면 유저가 선택), allowedProfileIds는 그 선택의 범위(없으면 전부),
	 * transform.enabled는 창작자의 이동·확대·회전 허용(없으면 허용).
	 */
	imageInput?: {
		profileId?: number
		allowedProfileIds?: number[]
		transform?: { enabled: boolean }
	}
	vectorAsset?: {
		collection: TemplateVectorAssetCollection
		id: number
		src: string
	}
	vectorFit?: 'fill' | 'contain'
	vectorColor?: string
}

/** DB의 overrides 필드가 저장하는 nodeId → 노드 설정 map. */
export type TemplateNodeConfigMap = Record<string, TemplateNodeConfig>
