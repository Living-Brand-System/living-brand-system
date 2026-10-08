import type { SampleImage } from '@/payload-types'

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
 * url이 없는 문서(업로드 실패·마이그레이션 잔해)는 고를 수 없으므로 목록에서 뺀다.
 * 브라우저 fetch(client)와 이미지 스튜디오 첫 화면의 서버 조회(service)가 같은 투영을 쓴다 —
 * 그래서 어느 쪽도 아닌 domain에 있다.
 */
export function toSampleImageOption(doc: SampleImage): SampleImageOption[] {
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
