import config from '@payload-config'
import { getPayload } from 'payload'
import type { PublishedGraphicProfileDefinition } from '@/features/graphic-generation/domain/graphic-studio-config'
import { isPayloadUser } from '@/lib/auth'

/**
 * 인증 사용자가 소비할 수 있는 published 캔버스 프로파일의 안전한 계약 필드만 조회한다.
 * 🔑 Graphic과 Graph는 같은 모양의 컬렉션을 갖는다 — 갈리는 것은 어느 테이블을 보느냐뿐이다.
 */
export async function listPublishedCanvasProfileDefinitions(
	user: unknown,
	collection: 'graphic-profiles' | 'graph-profiles',
): Promise<PublishedGraphicProfileDefinition[]> {
	if (!isPayloadUser(user)) throw new Error('Authenticated canvas profile consumer is required.')
	const payload = await getPayload({ config })
	const profiles = await payload.find({
		collection,
		// 미리보기 이미지를 채우려면 upload 관계가 한 단계 populate돼야 한다(depth 0은 id만 준다).
		// 반환 계약은 아래 projector가 좁히므로 populate로 필드를 더 고르지는 않는다.
		depth: 1,
		draft: false,
		limit: 100,
		overrideAccess: false,
		select: {
			controllerRestrictions: true,
			controllerPresentation: true,
			name: true,
			exportPolicy: true,
			previewImage: true,
			runtime: true,
		} as never,
		sort: 'displayOrder',
		user,
		where: { _status: { equals: 'published' } },
	})

	return profiles.docs.map((document) => {
		const {
			id,
			name,
			runtime,
			controllerRestrictions,
			controllerPresentation,
			exportPolicy,
			previewImage,
		} = document as typeof document & {
			controllerRestrictions?: unknown
			controllerPresentation?: unknown
			exportPolicy?: PublishedGraphicProfileDefinition['exportPolicy']
			previewImage?: unknown
		}
		return {
			id,
			name,
			runtime,
			controllerRestrictions,
			controllerPresentation,
			exportPolicy,
			previewImage,
		}
	})
}

/** Graphic Studio가 보는 프로파일. */
export async function listPublishedGraphicProfileDefinitions(
	user: unknown,
): Promise<PublishedGraphicProfileDefinition[]> {
	return listPublishedCanvasProfileDefinitions(user, 'graphic-profiles')
}
