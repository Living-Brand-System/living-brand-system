import { deriveGraphStudioConfig } from '@/features/graph-generation/domain/graph-studio-manifest'
import { listPublishedGraphProfileDefinitions } from '@/features/graph-generation/repositories/graph-profile.payload.repository'

/**
 * 유스케이스 경계: published Graph Profile을 runtime 기본값보다 좁은 Studio Config 목록으로 만든다.
 * Payload 조회 I/O는 repository가 소유한다.
 */
export async function listGraphStudioConfigs(user: unknown) {
	const profiles = await listPublishedGraphProfileDefinitions(user)
	return profiles.map(deriveGraphStudioConfig)
}
