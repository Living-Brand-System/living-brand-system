'use client'

import { createContext, type RefObject } from 'react'
import type { GraphicStudioConfig } from '@/features/graphic-generation/domain/graphic-studio-config'
import type { ImageTransformValue } from '@/features/template-customization/domain/image-edit-transform'
import type {
	ResolvedTemplateImageConfig,
	TemplateBackgroundType,
	TemplateStudioConfig,
	TemplateStudioConfigSlot,
	TemplateVectorSlot,
} from '@/features/template-customization/domain/template-studio-config'
import type {
	TemplateRasterArtifact,
	TemplateVectorArtifactResult,
	TemplateVideoArtifactProducer,
} from '@/features/template-customization/runtime/template-runtime.client'
import type { GetCreateNavigationOutput } from '@/features/template-customization/services/get-create-navigation.service'
import type { SampleImageOption } from '@/features/template-customization/services/list-sample-images.client'
import type { LazyResource } from '@/hooks/use-lazy-resource'
import type { CanvasVideoSource } from '@/modules/studio-artifact/studio-artifact'
import type {
	ControllerControlValue,
	ControllerRuntimeBindings,
	ControllerValues,
	StudioPreviewImage,
} from '@/modules/studio-controller/controller-definition'

/**
 * 슬롯이나 배경에 배정된 이미지. 출처가 다르면 뒤따르는 규칙이 달라 kind로 가른다 —
 * 생성 이미지는 만든 프로파일을 기억해 색 치환을 열고, 샘플 이미지는 선화로 표시된 것만 연다.
 */
export type TemplateAssignedImage =
	| { kind: 'generated'; url: string; generatedImageId: number; profileId: number }
	// 이름·썸네일을 함께 들고 다닌다 — 브라우저를 한 번도 열지 않은 화면도 고른 것을 그려야 한다.
	| {
			kind: 'sample'
			url: string
			sampleImageId: number
			name: string
			alt: string
			thumbnailUrl: string
			/** 선화로 표시된 샘플만 색 치환 대상이다 — 사진에 걸면 두 색으로 뭉개진다. */
			lineArt: boolean
	  }

/** 이미지 슬롯 하나의 입력·요청·결과 상태. 슬롯 단위를 쪼개지 않고 한 객체로 흐른다. */
export type TemplateImageSlotState = {
	profileId?: number
	/** Preset(샘플 고르기)과 Generate(프롬프트 생성) 중 무엇을 그릴지 — 배경과 같은 분기다. */
	imageMode: 'preset' | 'generate'
	prompt: string
	generating: boolean
	error: string | null
	featureValues: ControllerValues
	/** 배정된 이미지 — 없으면 슬롯은 저작 이미지 그대로다(transform도 잠긴다). */
	image?: TemplateAssignedImage
	transform?: ImageTransformValue
}

export type TemplateImageSlotPatch = Partial<
	Pick<TemplateImageSlotState, 'imageMode' | 'prompt' | 'transform'>
>

/** 캔버스 배경 하나의 입력·요청·결과 상태. */
export type TemplateBackgroundState = {
	type: TemplateBackgroundType
	imageMode: 'preset' | 'generate'
	color: string | null
	profileId?: number
	prompt: string
	generating: boolean
	error: string | null
	featureValues: ControllerValues
	graphicConfigId?: string
	graphicValues: ControllerValues
	/** 깔린 배경 이미지 — type=image일 때만 합성된다. */
	image?: TemplateAssignedImage
	/** 배경 위 디머 — 밝은 배경에서 글자가 묻히는 것을 창작자가 직접 누른다. 형식과 무관하다. */
	dimmer: boolean
	/** 껐다 켜도 맞춰 둔 강도가 남도록 on/off와 따로 든다. */
	dimmerOpacity: number
}

export type TemplateBackgroundPatch = Partial<
	Pick<TemplateBackgroundState, 'imageMode' | 'prompt' | 'dimmer' | 'dimmerOpacity'>
>

/**
 * 활성 섹션이 캔버스에서 무엇을 집는가.
 *
 * 🔑 **「활성 섹션」과 「집을 대상」을 나눈 이유**는 둘의 개수가 다르기 때문이다. 섹션은 하나인데
 *    Text 섹션은 텍스트 슬롯을 여럿 담고, Background 섹션은 노드를 하나도 담지 않는다. 대상을
 *    슬롯 하나로 고정했을 때 그 두 섹션에서 강조가 성립하지 않았다(2026-08-24).
 * 🔴 **배경의 주소는 노드가 아니라 도화지 자체다** — `composeTemplateHtml`의 `canvasBackground`가
 *    이미 그 경계를 갖는다(노드 오버라이드가 아니라 루트 프레임에 얹는다). 여기서도 같게 가른다.
 *
 * `sectionId`는 사이드바 면이 자기가 켜졌는지 아는 값이다 — 섹션당 하나이고, 그 섹션 안의 한 행만
 * 만질 때도 같은 값이 온다(그때는 `nodeIds`만 좁아진다).
 */
export type TemplateFocusTarget = { sectionId: string } & (
	| {
			kind: 'nodes'
			nodeIds: readonly string[]
			/**
			 * 이 슬롯의 입력칸으로 **커서까지** 옮겨 달라는 요청. 판에서 글자를 누른 사람은 곧바로
			 * 타이핑할 참이기 때문이다(사용자 지시, 2026-09-29).
			 *
			 * 🔴 상태를 따로 만들지 않는다 — 입력칸이 포커스를 받으면 그 자신이 이 플래그 없는
			 *    같은 대상으로 focus를 다시 세워서 **저절로 꺼진다.** 끄는 코드를 두면 누가 언제
			 *    끄는지가 또 하나의 규칙이 된다.
			 */
			caret?: boolean
	  }
	| { kind: 'canvas' }
)

/**
 * 텍스트 섹션의 식별자 — 텍스트는 상자가 여럿이어도 컨트롤 그룹이 하나다.
 * 🔴 Figma 노드 id는 `82:11` 꼴이라 이 값과 겹치지 않는다.
 */
export const TEMPLATE_TEXT_SECTION_ID = 'section:text'
export const TEMPLATE_BACKGROUND_SECTION_ID = 'section:background'

/**
 * 슬롯 하나를 집는 focus 대상 — **사이드바와 캔버스가 같은 규칙을 쓴다.**
 * 🔴 두 입구가 각자 만들면 같은 슬롯을 집었는데 사이드바 면이 한쪽에서만 켜진다. 실제로
 *    텍스트는 섹션이 하나(`section:text`)이고 이미지·CI는 슬롯마다 섹션이라 규칙이 갈린다.
 */
export function templateSlotFocusTarget(
	kind: 'text' | 'image' | 'vector',
	nodeId: string,
	options: { caret?: boolean } = {},
): TemplateFocusTarget {
	return {
		sectionId: kind === 'text' ? TEMPLATE_TEXT_SECTION_ID : nodeId,
		kind: 'nodes',
		nodeIds: [nodeId],
		...(options.caret ? { caret: true } : {}),
	}
}

export type TemplateStudioValue = {
	navigation: {
		/** 현재 템플릿이 속한 카테고리 이름 — 식별 카드의 부제다. 목록 없이도 알아야 해서 서버가 함께 내린다. */
		categoryTitle: string | null
		/** 교체 후보 — 자산 브라우저가 열릴 때 가져온다. 열기 전에는 data가 null이다. */
		browse: LazyResource<GetCreateNavigationOutput['categories']>
	}
	/** Preset 후보 — 배경과 이미지 슬롯이 같은 목록을 쓰므로 한 자리에서 한 번만 가져온다. */
	sampleImages: LazyResource<readonly SampleImageOption[]>
	/** 템플릿 편집 계약 — Sidebar와 Canvas는 이 객체와 세션 state만 소비한다. */
	config: TemplateStudioConfig
	editing: {
		targetId: string | null
		/** 편집 중인 대상의 표시 정보 — 방식·카드 제목·미리보기는 세션이 파생하고 UI는 읽기만 한다. */
		target: {
			mode: 'image' | 'graphic' | 'color'
			name: string | null
			preview: StudioPreviewImage | undefined
		} | null
		busy: boolean
		begin: (slotId: string) => void
		complete: () => void
		cancel: () => void
		reset: () => void
	}
	text: {
		values: Record<string, string>
		setValue: (slotId: string, text: string) => void
		color: string | null
		setColor: (hex: string | null) => void
		clippedSlotIds: ReadonlySet<string>
	}
	images: {
		states: Record<string, TemplateImageSlotState>
		contracts: Record<string, readonly ResolvedTemplateImageConfig[]>
		update: (slotId: string, patch: TemplateImageSlotPatch) => void
		updateFeature: (slotId: string, controlId: string, value: ControllerControlValue) => void
		selectProfile: (slotId: string, profileId: number) => void
		selectSampleImage: (slotId: string, option: SampleImageOption) => void
		/** `prompt`를 주면 세션 상태 대신 그 값으로 생성한다 — 챗이 얹은 패치를 같은 tick에 태우는 통로. */
		generate: (slotId: string, prompt?: string) => Promise<void>
	}
	vectors: {
		slots: readonly TemplateVectorSlot[]
		colors: Record<string, string | undefined>
		setColor: (slotId: string, color: string) => void
	}
	layers: {
		visibility: Record<string, boolean>
		setVisible: (slotId: string, visible: boolean) => void
		/**
		 * 레이어 패널에서 고른 **종류**. 고르는 단위는 레이어 하나가 아니라 Text·Image·CI·Background
		 * 묶음이다(사용자 지시, 2026-09-29) — 텍스트를 고치려는 사람은 텍스트 상자 하나가 아니라
		 * 텍스트 전부를 한 번에 본다. 그래서 하위 줄은 목록에만 있고 고를 수 없다.
		 *
		 * 🔴 **`focus`와 다른 것이다.** 컨트롤러는 평소에 아무것도 보여주지 않고 이 값이 있을 때만
		 *    그 묶음의 컨트롤을 낸다 — `focus`로 대신하면 입력칸에 커서를 넣는 것만으로 대상이
		 *    바뀌어 방금 고른 것이 사라진다(`focus`는 「지금 만지는 자리」이고 이것은 「고른 것」이다).
		 */
		selectedKind: TemplateStudioConfigSlot['kind'] | null
		selectedId: string | null
		select: (kind: string | null) => void
	}
	background: {
		state: TemplateBackgroundState
		contracts: readonly ResolvedTemplateImageConfig[]
		featureBindings: ControllerRuntimeBindings
		graphicConfigs: readonly GraphicStudioConfig[]
		graphicBindings: ControllerRuntimeBindings
		update: (patch: TemplateBackgroundPatch) => void
		setColor: (hex: string | null) => void
		selectType: (value: ControllerControlValue) => void
		updateFeature: (controlId: string, value: ControllerControlValue) => void
		selectImageProfile: (profileId: number) => void
		selectSampleImage: (option: SampleImageOption) => void
		selectGraphicConfig: (configId: string) => void
		updateGraphic: (controlId: string, value: ControllerControlValue) => void
		generate: () => Promise<void>
	}
	/**
	 * 사이드바에서 지금 만지는 섹션과, 캔버스가 집어 보여 줄 대상.
	 * 🔑 사이드바와 캔버스는 서로를 모르므로 이 컨텍스트가 유일한 연결이다.
	 * 🔴 편집 세션이 아니라 이 화면의 표현 상태다 — 내보내는 HTML에 흔적을 남기지 않는다.
	 */
	focus: {
		target: TemplateFocusTarget | null
		set: (target: TemplateFocusTarget | null) => void
		/**
		 * 강조에 쓰는 브랜드 색(hex). 값의 정본은 `brand-colors` 컬렉션이고 서버가 이름으로 찾아
		 * 내린다 — 코드에 hex를 박지 않는다(`docs/09` §4의 색-데이터 예외).
		 * 🔴 못 찾으면 null이고 캔버스가 토큰으로 폴백한다.
		 */
		color: string | null
	}
	canvas: {
		html: string
		artifact: () => TemplateRasterArtifact
		/** 인쇄용 벡터. 같은 판을 굽지 않고 재서 도형으로 옮긴다(진단이 함께 나온다). */
		vectorArtifact: () => Promise<TemplateVectorArtifactResult>
		/** 배경 Graphic이 켜져 있을 때만 시간축이 있다 — 그 밖에는 MP4도 정지 화면이 정답이다. */
		videoArtifact: TemplateVideoArtifactProducer | null
		previewRef: RefObject<HTMLDivElement | null>
		registerGraphicFrame: (capture: (() => string) | null) => void
		registerGraphicVideo: (source: CanvasVideoSource | null) => void
	}
	execution: {
		controllerValues: ControllerValues
	}
}

export const TemplateStudioContext = createContext<TemplateStudioValue | null>(null)
