import { deriveGraphicStudioConfig } from '@/features/graphic-generation/domain/graphic-studio-manifest'
import { listPublishedGraphicProfileDefinitions } from '@/features/graphic-generation/repositories/canvas-profile.payload.repository'

/**
 * 유스케이스 경계: published Graphic Profile을 runtime 기본값보다 좁은 Studio Config 목록으로 만든다.
 * Payload 조회 I/O는 repository가 소유한다.
 */
export async function listGraphicStudioConfigs(user: unknown) {
	const profiles = await listPublishedGraphicProfileDefinitions(user)
	return profiles.map(deriveGraphicStudioConfig)
}
