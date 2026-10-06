import type { FigmaSourceNode } from '@/features/template-import/utils/figma-ir'
import { FigmaApiError, type FigmaApiStage, FigmaImportError } from '@/lib/errors'

/**
 * Figma REST API 경계. 임포트 파이프라인의 외부 I/O는 모두 이 파일이 소유한다.
 * 토큰은 요청한 사용자의 것을 호출자가 넘긴다(서버 공용 토큰 없음). 응답은 가공 없이 돌려준다.
 */

const FIGMA_API_BASE = 'https://api.figma.com/v1'
const IMAGE_BATCH_SIZE = 100

function throwFigmaApiError(response: Response, stage: FigmaApiStage): never {
	const retryAfterHeader = response.headers.get('retry-after')
	const retryAfterValue = retryAfterHeader === null ? undefined : Number(retryAfterHeader)
	throw new FigmaApiError(
		stage,
		response.status,
		retryAfterValue !== undefined && Number.isInteger(retryAfterValue) && retryAfterValue >= 0
			? retryAfterValue
			: undefined,
		response.headers.get('x-figma-plan-tier') ?? undefined,
		response.headers.get('x-figma-rate-limit-type') ?? undefined,
	)
}

export async function findFigmaNodeTree(
	token: string,
	fileKey: string,
	nodeId: string,
): Promise<FigmaSourceNode> {
	const url = `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}&geometry=paths`
	const response = await fetch(url, { headers: { 'X-Figma-Token': token } })

	if (!response.ok) {
		throwFigmaApiError(response, 'nodes')
	}

	const data = (await response.json()) as {
		nodes?: Record<string, { document?: FigmaSourceNode }>
	}
	const rootNode = data.nodes?.[nodeId]?.document

	if (!rootNode) {
		throw new FigmaImportError(
			`Figma node "${nodeId}" not found in file "${fileKey}".`,
			'Figma 파일에서 지정한 프레임을 찾을 수 없습니다. URL과 node-id를 확인하세요.',
			404,
		)
	}

	return rootNode
}

/**
 * 노드들을 렌더한 임시 URL 맵을 돌려준다. 렌더 실패 노드는 맵에서 빠진다.
 * png는 scale=2(hiDPI), svg는 벡터 보존용으로 벡터 계열 노드에 쓴다.
 */
export async function findFigmaImageUrls(
	token: string,
	fileKey: string,
	nodeIds: string[],
	format: 'png' | 'svg',
): Promise<Record<string, string>> {
	const imageUrls: Record<string, string> = {}
	const formatQuery =
		format === 'svg' ? 'format=svg&use_absolute_bounds=true' : 'format=png&scale=2'

	for (let i = 0; i < nodeIds.length; i += IMAGE_BATCH_SIZE) {
		const batch = nodeIds.slice(i, i + IMAGE_BATCH_SIZE)
		const url = `${FIGMA_API_BASE}/images/${fileKey}?ids=${encodeURIComponent(batch.join(','))}&${formatQuery}`
		const response = await fetch(url, { headers: { 'X-Figma-Token': token } })

		if (!response.ok) {
			throwFigmaApiError(response, 'images')
		}

		const data = (await response.json()) as { images?: Record<string, string | null> }

		for (const [nodeId, imageUrl] of Object.entries(data.images ?? {})) {
			if (imageUrl) {
				imageUrls[nodeId] = imageUrl
			}
		}
	}

	return imageUrls
}

/**
 * 파일의 IMAGE fill 원본(imageRef → 임시 다운로드 URL) 맵을 돌려준다.
 * 파일 단위 단일 호출이며 nodeId가 아닌 imageRef가 키다. URL은 곧 만료되므로 임포트 중에만 쓴다.
 */
export async function findFigmaImageFillUrls(
	token: string,
	fileKey: string,
): Promise<Record<string, string>> {
	const url = `${FIGMA_API_BASE}/files/${fileKey}/images`
	const response = await fetch(url, { headers: { 'X-Figma-Token': token } })

	if (!response.ok) {
		throwFigmaApiError(response, 'image-fills')
	}

	const data = (await response.json()) as { meta?: { images?: Record<string, string> } }
	return data.meta?.images ?? {}
}

/** 이미지 조각 하나의 최대 크기 — 폭주한 렌더 결과가 메모리·S3를 잠식하지 않게 막는다. */
const MAX_IMAGE_BYTES = 15 * 1024 * 1024

/** Figma가 준 임시 S3 URL에서 이미지 바이트를 내려받는다. URL은 곧 만료되므로 임포트 중에만 쓴다. */
export async function downloadFigmaImage(url: string): Promise<{ data: Buffer; mimeType: string }> {
	const response = await fetch(url)

	if (!response.ok) {
		throw new FigmaImportError(
			`Figma image download failed (${response.status})`,
			'Figma 렌더 이미지를 내려받지 못했습니다. 잠시 후 다시 가져오세요.',
		)
	}

	const data = Buffer.from(await response.arrayBuffer())

	if (data.byteLength > MAX_IMAGE_BYTES) {
		throw new FigmaImportError(
			`Figma image exceeds size limit (${data.byteLength} bytes)`,
			'Figma 레이어 이미지가 가져오기 제한인 15MB를 초과했습니다.',
			413,
		)
	}

	return {
		data,
		mimeType: response.headers.get('content-type') || 'image/png',
	}
}
