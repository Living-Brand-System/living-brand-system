'use client'

import { renderRasterArtifactToPng } from '@/features/studio-export/services/export-artifact.client'
import type { RasterArtifact } from '@/modules/studio-artifact/studio-artifact'
import type { StudioPreviewImage } from '@/modules/studio-controller/controller-definition'

/**
 * 캡처를 요청할 긴 변 길이(CSS px). 카드가 object-cover라 비율은 자유롭다.
 *
 * 🔴 결과 파일은 이 값이 아니다 — 캔버스 런타임이 `pixelDensity(2)`로 그리면 백업 저장소가 2배라
 * 실측 2048px가 나온다(로컬 확인: 요청 906×1024 → 파일 1812×2048). 더 선명한 쪽이라 그대로 두되,
 * 「1024짜리 파일이 생긴다」로 읽지 말 것.
 */
const PREVIEW_MAX_DIM = 1024

export type StudioPreviewKind = 'graphic' | 'graph' | 'image' | 'template'

/**
 * 지금 화면의 Raster Artifact를 캡처해 프로파일 미리보기로 저장한다.
 *
 * 🔑 렌더는 export가 쓰는 `renderRasterArtifactToPng`를 그대로 쓴다 — 미리보기 전용 렌더 경로를
 * 따로 만들면 내보낸 파일과 카드 그림이 갈린다. 그 함수가 요청 크기로 다시 그리고 원래 해상도로
 * 복원하는 것까지 이미 소유한다.
 */
export async function updateProfilePreview({
	studio,
	profileId,
	artifact,
	viewport,
}: {
	studio: StudioPreviewKind
	profileId: string | number
	artifact: RasterArtifact
	viewport: { width: number; height: number }
}): Promise<StudioPreviewImage | undefined> {
	const blob = await renderRasterArtifactToPng(
		artifact,
		{ scale: 1, transparent: false },
		fitWithin(viewport, PREVIEW_MAX_DIM),
	)

	const body = new FormData()
	body.set('studio', studio)
	body.set('profileId', String(profileId))
	body.set('file', blob, 'preview.png')

	const response = await fetch('/api/studio/preview', { method: 'POST', body })
	if (!response.ok) {
		const message = await response
			.json()
			.then((payload: { message?: string }) => payload.message)
			.catch(() => undefined)
		throw new Error(message ?? '미리보기를 갱신하지 못했습니다.')
	}

	const result = (await response.json()) as { previewImage?: StudioPreviewImage }
	return result.previewImage
}

/** 화면 비율을 유지한 채 긴 변을 maxDim에 맞춘다 — 정사각으로 강제하면 구도가 찌그러진다. */
function fitWithin(viewport: { width: number; height: number }, maxDim: number) {
	const longest = Math.max(viewport.width, viewport.height)
	if (longest <= 0) return { width: maxDim, height: maxDim }
	const scale = maxDim / longest
	return {
		width: Math.max(1, Math.round(viewport.width * scale)),
		height: Math.max(1, Math.round(viewport.height * scale)),
	}
}
