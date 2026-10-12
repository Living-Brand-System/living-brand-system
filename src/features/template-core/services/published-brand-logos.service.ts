import {
	findPublishedBrandLogos,
	type PublishedBrandLogo,
} from '@/features/template-core/repositories/brand-logo.payload.repository'

export type { PublishedBrandLogo }

/**
 * template-core가 소유하는 발행 로고 조회 공개 계약(CI 모양·색상 포함).
 * 가져오기의 로고 인식과 템플릿 CI 레이어의 색 버전 선택이 쓴다.
 */
export async function listPublishedBrandLogos(): Promise<PublishedBrandLogo[]> {
	return findPublishedBrandLogos()
}
