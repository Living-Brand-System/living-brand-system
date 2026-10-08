import type { SampleImage } from '@/payload-types'
import { type SampleImageOption, toSampleImageOption } from '../domain/sample-image-option'

// 자산 브라우저가 한 번에 그리는 양. 더 늘면 목록을 페이지로 끊는 대신 검색을 먼저 붙인다.
const PUBLISHED_QUERY = 'depth=0&limit=100&where[_status][equals]=published&sort=name'

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
