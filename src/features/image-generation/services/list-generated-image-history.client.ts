import type { GeneratedImageHistoryItem } from '@/features/image-generation/domain/generated-image-history'

export type GeneratedImageHistoryPage = {
	items: GeneratedImageHistoryItem[]
	hasMore: boolean
}

/**
 * 생성 이미지 목록 클라이언트 서비스 — GET /api/studio/image/history 호출의 계약을 소유한다.
 * 실패는 던져서 호출자가 재시도 안내를 그리게 한다.
 */
export async function fetchGeneratedImageHistory(
	page: number,
	options: { bestOnly?: boolean } = {},
): Promise<GeneratedImageHistoryPage> {
	const query = options.bestOnly ? `page=${page}&best=1` : `page=${page}`
	const response = await fetch(`/api/studio/image/history?${query}`)
	if (!response.ok) throw new Error('생성한 이미지를 불러오지 못했습니다.')
	const data = (await response.json()) as Partial<GeneratedImageHistoryPage>
	return { hasMore: data.hasMore ?? false, items: data.items ?? [] }
}
