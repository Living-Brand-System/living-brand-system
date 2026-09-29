import type { SampleImage } from '@/payload-types'

// 자산 브라우저가 한 번에 그리는 양. 더 늘면 목록을 페이지로 끊는 대신 검색을 먼저 붙인다.
const PUBLISHED_QUERY = 'depth=0&limit=100&where[_status][equals]=published&sort=name'

/** 피커가 카드 한 장을 그리는 데 필요한 것만 남긴 투영 — Payload 응답 모양에 UI가 매이지 않는다. */
export type SampleImageOption = {
	id: number
	name: string
	alt: string
	url: string
	/** 목록용 축소본. 없으면 원본을 그대로 쓴다(썸네일 생성 전 문서). */
	thumbnailUrl: string
	/** 선으로만 그린 이미지인지 — 켜져 있어야 슬롯의 색 조정이 이 이미지에 걸린다. */
	lineArt: boolean
	/** 브라우저의 태그 필터가 쓰는 분류. 비어 있으면 어느 태그에도 속하지 않는다. */
	group: string
	/**
	 * 원본 판형(px). 어느 판에 어울리는 그림인지는 고르기 **전에** 보여야 한다 —
	 * 썸네일은 전부 같은 칸에 들어가 비율을 감춘다. 업로드가 크기를 못 읽었으면 null이다.
	 */
	width: number | null
	height: number | null
}

/**
 * 템플릿 스튜디오의 Preset 브라우저가 열릴 때 published 샘플 이미지를 읽는다.
 * Payload REST I/O는 이 client service가 소유한다. 실패는 던져서 호출자가 재시도 안내를 그리게 한다.
 */
export async function fetchSampleImages(): Promise<SampleImageOption[]> {
	const response = await fetch(`/api/sample-images?${PUBLISHED_QUERY}`)
	if (!response.ok) throw new Error('샘플 이미지를 불러오지 못했습니다.')
	const body = (await response.json()) as { docs?: SampleImage[] }
	return (Array.isArray(body.docs) ? body.docs : []).flatMap(toSampleImageOption)
}

/** url이 없는 문서(업로드 실패·마이그레이션 잔해)는 고를 수 없으므로 목록에서 뺀다. */
function toSampleImageOption(doc: SampleImage): SampleImageOption[] {
	if (!doc.url) return []
	return [
		{
			id: doc.id,
			name: doc.name,
			alt: doc.alt,
			url: doc.url,
			thumbnailUrl: doc.sizes?.thumbnail?.url ?? doc.url,
			lineArt: doc.lineArt ?? false,
			group: doc.group ?? '',
			width: doc.width ?? null,
			height: doc.height ?? null,
		},
	]
}
