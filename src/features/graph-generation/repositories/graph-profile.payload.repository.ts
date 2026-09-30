import type { PublishedGraphProfileDefinition } from '@/features/graph-generation/domain/graph-studio-config'
import { listPublishedCanvasProfileDefinitions } from '@/features/graphic-generation/repositories/canvas-profile.payload.repository'

/** 인증 사용자가 소비할 수 있는 published Graph Profile의 안전한 계약 필드만 조회한다. */
export async function listPublishedGraphProfileDefinitions(
	user: unknown,
): Promise<PublishedGraphProfileDefinition[]> {
	return listPublishedCanvasProfileDefinitions(user, 'graph-profiles')
}
