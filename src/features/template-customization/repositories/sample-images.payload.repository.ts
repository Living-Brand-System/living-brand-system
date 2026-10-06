import config from '@payload-config'
import { getPayload } from 'payload'
import type { SampleImage } from '@/payload-types'

/**
 * 발행된 샘플 이미지 — 컬렉션 접근 규칙이 비관리자에게 발행본만 보여 주므로 사용자 권한으로 읽는다.
 * 🔴 overrideAccess를 끄는 것이 경계다 — 켜면 draft가 공개 화면에 샌다.
 */
export async function listPublishedSampleImageDocuments(user: unknown): Promise<SampleImage[]> {
	const payload = await getPayload({ config })
	const result = await payload.find({
		collection: 'sample-images',
		depth: 0,
		draft: false,
		limit: 100,
		overrideAccess: false,
		sort: 'name',
		user: user as never,
		where: { _status: { equals: 'published' } },
	})
	return result.docs
}
