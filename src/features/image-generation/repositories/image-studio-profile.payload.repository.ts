import config from '@payload-config'
import { getPayload } from 'payload'
import type { PublishedImageProfileDefinition } from '@/features/image-generation/domain/image-studio-config'
import { isPayloadUser } from '@/lib/auth'

/** Image Studio가 Config를 파생할 수 있는 published 프로파일 정의만 조회한다. */
export async function listPublishedImageProfileDefinitions(
	user: unknown,
): Promise<PublishedImageProfileDefinition[]> {
	if (!isPayloadUser(user)) {
		throw new Error('Authenticated image profile consumer is required.')
	}
	const payload = await getPayload({ config })
	const profiles = await payload.find({
		collection: 'image-profiles',
		// 미리보기 이미지를 채우려면 upload 관계가 한 단계 populate돼야 한다(depth 0은 id만 준다).
		depth: 1,
		draft: false,
		limit: 100,
		// worker에게 숨긴 모델은 Service Base Definition 파생에만 쓰고 projector가 반환에서 제거한다.
		overrideAccess: true,
		select: {
			controllerRestrictions: true,
			features: true,
			imageModelPreset: true,
			name: true,
			exportPolicy: true,
			previewImage: true,
			slug: true,
		} as never,
		sort: 'displayOrder',
		user: user as never,
		where: { _status: { equals: 'published' } },
	})

	return profiles.docs.map((document) => {
		const {
			id,
			name,
			slug,
			imageModelPreset,
			controllerRestrictions,
			features,
			exportPolicy,
			previewImage,
		} = document as typeof document & {
			controllerRestrictions?: unknown
			features?: unknown
			previewImage?: unknown
		}
		return {
			id,
			name,
			slug: slug || null,
			imageModelPreset,
			controllerRestrictions,
			features,
			exportPolicy,
			previewImage,
		}
	})
}
