'use client'

import { useCallback, useState } from 'react'
import type { ImageGenerationMetadata, ImageResultImage } from '../contexts/image-studio-context'
import type { ImageAspectRatio, ImageOutputSize } from '../domain/image-size'
import {
	type ImageGenerationRequest,
	requestImageGeneration,
} from '../services/generate-image.client'

const GENERATION_ERROR_MESSAGE = '이미지 생성에 실패했어요. 잠시 후 다시 시도해 주세요.'

export type ImageGenerationSession = {
	metadata?: ImageGenerationMetadata
	/** 이 요청이 만든 것. */
	images: readonly ImageResultImage[]
	/** 무엇을 보고 만들었나 — null이면 프롬프트에서 바로 나온 세션. */
	reference: ImageResultImage | null
	/** 저장 크기 계산에 쓰는 이 요청의 출력 조건 — 응답이 정본이다. */
	output: { aspectRatio: ImageAspectRatio; imageSize: ImageOutputSize }
}

export function useImageGeneration() {
	const [session, setSession] = useState<ImageGenerationSession | null>(null)
	const [requested, setRequested] = useState(0)
	const [selected, setSelected] = useState<number | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	/**
	 * 생성 요청 하나 = 세션 하나. 참조를 함께 주면 그 이미지가 세션에 남아 그리드 0번이 된다.
	 * 참조 고정은 호출자(Provider)가 `session.reference ?? selected`로 정한다.
	 */
	const generate = useCallback(
		async (input: ImageGenerationRequest, reference: ImageResultImage | null = null) => {
			if (loading) return

			setLoading(true)
			setError(null)
			setSelected(null)
			setRequested(input.count)

			try {
				const next = await requestImageGeneration(input)
				const downloadPrompt = input.prompt.trim() || reference?.downloadPrompt || ''
				const createdAt = next.generatedImages?.[0]?.createdAt

				const images = next.images.map((src, index) => ({
					src,
					downloadPrompt,
					generatedImageId: next.generatedImages?.[index]?.id ?? null,
					profileId: next.profileId ?? null,
				}))
				setSession({
					metadata: {
						profileName: next.profileName || 'image',
						prompt: downloadPrompt,
						createdAt: createdAt || new Date().toISOString(),
					},
					images,
					reference,
					output: { aspectRatio: next.aspectRatio, imageSize: next.imageSize },
				})
				// 결과가 오면 첫 결과를 고른다 — 선택이 비어 있으면 최하단 저장 CTA가 켜지지 않는다.
				setSelected(images.length > 0 ? (reference ? 1 : 0) : null)
			} catch (requestError) {
				console.error(requestError)
				setError(
					requestError instanceof Error ? requestError.message : GENERATION_ERROR_MESSAGE,
				)
			} finally {
				setLoading(false)
			}
		},
		[loading],
	)

	return { error, generate, loading, requested, selected, session, setSelected }
}
