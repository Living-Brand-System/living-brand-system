'use client'

import { createContext } from 'react'
import type { GeneratedImageHistoryItem } from '@/features/image-generation/domain/generated-image-history'
import type {
	ImageAspectRatio,
	ImageOutputSize,
} from '@/features/image-generation/domain/image-size'
import type { ImageStudioConfig } from '@/features/image-generation/domain/image-studio-config'
import type { ImageColorAdjustment } from '@/features/image-generation/runtime/image-colorize'
import type { LazyResource } from '@/hooks/use-lazy-resource'
import type {
	ControllerControlValue,
	ControllerRuntimeBindings,
	ControllerValues,
} from '@/modules/studio-controller/controller-definition'

/** 그리드 카드 한 장. 참조와 결과가 같은 형태라 그리드가 둘을 구분해 다루지 않아도 된다. */
export type ImageGenerationMetadata = {
	profileName: string
	prompt: string
	createdAt: string
}

export type ImageResultImage = {
	downloadPrompt?: string
	src: string
	generatedImageId: number | null
	profileId: number | null
}

export type ImageStudioValue = {
	profiles: {
		/** 이 세션에서 쓴 계약들 — 계약은 언제나 이 중 하나다. 결과가 자기 프로파일의 출력 능력을 되찾는 데도 쓴다. */
		options: readonly ImageStudioConfig[]
		/** 교체 후보 — 자산 브라우저가 열릴 때 가져온다. 열기 전에는 data가 null이다. */
		browse: LazyResource<readonly ImageStudioConfig[]>
		select: (profileId: number) => void
	}
	/**
	 * 좌측 갤러리에서 고른 과거 묶음 — 캔버스가 이걸 크게 그린다.
	 *
	 * 🔑 「고르는 것」과 「컨트롤러를 덮는 것」은 다르다. 고르기는 누구나 되고, 덮기는 복원 값이
	 *    있을 때만 일어난다(권한이 닫힌 사용자에게는 메타 필드가 안 내려온다).
	 */
	history: {
		/** 지금 고른 묶음. 비어 있으면 아직 아무것도 안 골랐다. */
		stack: readonly GeneratedImageHistoryItem[]
		/** 그 묶음에서 크게 볼 장. */
		selectedId: number | null
		/**
		 * 묶음을 고른다 — `itemId`를 안 주면 **첫 장이 자동으로 선택된다**(사용자 지시).
		 * 가능하면 컨트롤러도 고른 장의 값으로 덮인다.
		 */
		selectStack: (items: readonly GeneratedImageHistoryItem[], itemId?: number) => void
		/** 묶음 안에서 크게 볼 장만 바꾼다 — 같은 요청에서 나온 장들이라 컨트롤러는 그대로다. */
		selectItem: (id: number) => void
	}
	/** 현재 프로파일의 편집 계약 — 컨트롤러는 이 객체만 보고 컨트롤을 그린다. */
	config: ImageStudioConfig
	controls: {
		values: ControllerValues
		bindings: ControllerRuntimeBindings
		update: (controlId: string, value: ControllerControlValue) => void
	}
	prompt: {
		value: string
		setValue: (text: string) => void
	}
	generation: {
		batch: number
		setBatch: (count: number) => void
		ratio: ImageAspectRatio
		setRatio: (ratio: ImageAspectRatio) => void
		resolution: ImageOutputSize
		setResolution: (resolution: ImageOutputSize) => void
		run: () => void
		canRun: boolean
		busy: boolean
		error: string | null
	}
	color: {
		/** 색 조정 값 — 계약이 색을 열지 않으면 null이고, 그때는 색 행도 굽는 저장도 없다. */
		value: ImageColorAdjustment | null
		update: (patch: Partial<ImageColorAdjustment>) => void
	}
	reference: {
		/** 첨부한 참조 이미지의 data URI — 저장하지 않으므로 이 세션 메모리가 유일한 사본이다. */
		value: string | null
		name: string | null
		/** 형식·용량으로 거절한 사유. 서버까지 가지 않고 화면에서 잡은 것만 여기 있다. */
		error: string | null
		preparing: boolean
		attach: (file: File) => void
		clear: () => void
	}
	camera: {
		azimuthDeg: number
		elevationDeg: number
		setAngles: (angles: { azimuthDeg: number; elevationDeg: number }) => void
		/** 시점을 다시 잡을 참조 — null이면 대상이 없다(컨트롤러가 그룹을 잠근다). */
		seedImage: string | null
		regenerate: () => void
	}
	results: {
		metadata?: ImageGenerationMetadata
		/** 그리드가 그리는 순서 그대로 — 참조가 있으면 0번이 참조다. */
		items: readonly ImageResultImage[]
		/** items에서 참조가 차지하는 자리. 참조가 없으면 null. */
		referenceIndex: number | null
		/** 결과와 현재 프로파일이 같을 때만 적용할 색. 다른 프로파일의 기능은 소급하지 않는다. */
		color: ImageColorAdjustment | null
		/** 요청한 장수 — 생성 중 자리표시자 개수. */
		requested: number
		selected: number | null
		select: (index: number | null) => void
		/** 저장 크기 계산에 쓰는 직전 요청의 출력 조건. */
		output: { aspectRatio: ImageAspectRatio; imageSize: ImageOutputSize } | null
	}
}

export const ImageStudioContext = createContext<ImageStudioValue | null>(null)
