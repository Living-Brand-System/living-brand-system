/**
 * 이미지 생성 클라이언트 서비스 — 사용자/Admin 생성 요청의 HTTP 계약을 소유한다.
 * 생성 실행·인증은 route 뒤의 generate-image service가 담당하고,
 * 화면 상태(로딩·에러 표시)는 호출자(useImageGeneration, Admin AiImageForm)가 담당한다.
 */

import type { CameraControlInput } from '@/features/image-generation/domain/camera-control'
import type { ImageModelPreset } from '@/features/image-generation/domain/image-model'
import type {
	FlatImagePrompt,
	ImageProfilePromptRow,
	ImagePromptNormalizationRow,
} from '@/features/image-generation/domain/image-profile-prompt'
import type {
	ImageAspectRatio,
	ImageOutputSize,
} from '@/features/image-generation/domain/image-size'

export interface ImageGenerationRequest {
	count: number
	prompt: string
	profileId: number
	/** 템플릿 이미지 슬롯 박스에서 유도한 비율 오버라이드 — 없으면 프로파일 비율로 생성한다. */
	aspectRatio?: ImageAspectRatio
	/** 스튜디오 해상도 선택 오버라이드 — 없으면 프로파일 해상도로 생성한다. */
	imageSize?: ImageOutputSize
	/** 참조 이미지 — 없으면 프롬프트만으로 생성한다. 첨부(`upload`)는 저장하지 않는 1회용 data URI다. */
	reference?: { generatedImageId: number } | { upload: string }
	/** 카메라 컨트롤 값 — 프로파일이 카메라를 열었을 때만 보낸다. */
	camera?: CameraControlInput
}

type AdminImageGenerationRequest = {
	count: number
	prompt: string
} & (
	| {
			aspectRatio: ImageAspectRatio
			imageModelPreset: ImageModelPreset
			imageSize: ImageOutputSize
			profileId?: never
	  }
	| {
			/** 선택한 프레임 박스에서 유도한 비율 오버라이드 — 없으면 프로파일 비율로 생성한다. */
			aspectRatio?: ImageAspectRatio
			imageModelPreset?: never
			imageSize?: never
			profileId: number
	  }
)

export interface ImageProfileOption {
	id: number
	name: string
}

export interface ImagePromptNormalizationRequest {
	profilePrompt: ImageProfilePromptRow[]
	userPromptNormalization: ImagePromptNormalizationRow[]
	userPrompt: string
}

export interface ImagePromptNormalizationResult {
	finalPrompt: FlatImagePrompt
	normalizedInput: FlatImagePrompt
}

export interface GeneratedImageReference {
	collection: 'generated-images'
	createdAt: string
	id: number
	url: string
}

/** 생성 API 응답 계약 — 서버 서비스도 이 타입에 provider만 더해 쓴다(이중 정의 금지). */
export interface ImageGenerationResult {
	aspectRatio: ImageAspectRatio
	generatedImages?: GeneratedImageReference[]
	images: string[]
	imageSize: ImageOutputSize
	model: string
	prompt: string
	profileId?: number
	profileName?: string
}

/** 사용자 이미지 생성을 요청한다. */
export function requestImageGeneration(
	input: ImageGenerationRequest,
): Promise<ImageGenerationResult> {
	return postImageGeneration<ImageGenerationResult>('/api/generate-image', input)
}

/** Admin 이미지 생성을 요청한다. */
export function requestAdminImageGeneration(
	input: AdminImageGenerationRequest,
): Promise<ImageGenerationResult> {
	return postImageGeneration<ImageGenerationResult>('/api/admin/generate-image', input)
}

/** Payload REST에서 현재 사용자가 선택할 수 있는 published 이미지 프로파일을 조회한다. */
export async function requestPublishedImageProfiles(): Promise<ImageProfileOption[]> {
	const response = await fetch(
		'/api/image-profiles?depth=0&limit=100&sort=displayOrder&select[id]=true&select[name]=true&where[_status][equals]=published',
	)
	if (!response.ok) throw new Error('이미지 프로파일을 불러오지 못했습니다.')
	const body = (await response.json()) as { docs?: ImageProfileOption[] }
	return Array.isArray(body.docs) ? body.docs : []
}

/** Admin 이미지 프로파일 테스트 패널의 프롬프트 정규화를 요청한다. */
export async function requestImagePromptNormalization(
	input: ImagePromptNormalizationRequest,
): Promise<ImagePromptNormalizationResult> {
	const response = await fetch('/api/image-profiles/normalize', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	const body = (await response.json().catch(() => null)) as
		| (ImagePromptNormalizationResult & { message?: string })
		| null
	if (!response.ok || !body?.finalPrompt) {
		throw new Error(body?.message || '프롬프트 정규화에 실패했습니다.')
	}
	return { finalPrompt: body.finalPrompt, normalizedInput: body.normalizedInput }
}

async function postImageGeneration<Result extends ImageGenerationResult>(
	url: string,
	input: AdminImageGenerationRequest | ImageGenerationRequest,
): Promise<Result> {
	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	const body = (await response.json().catch(() => null)) as (Result & { message?: string }) | null
	if (!response.ok) throw new Error(body?.message || `생성 실패 (${response.status})`)
	if (!body) throw new Error('생성 응답이 올바르지 않습니다.')
	return body
}
