import type { PayloadRequest } from 'payload'
import type { Rule } from '@/payload-types'

/**
 * published Rule 전체를 읽는다(검수 프로파일이 고를 수 있는 Check의 모집단).
 * 🔑 요청자가 있으면 그 권한으로 읽는다 — overrideAccess는 사용자 없는 서버 호출에만 연다.
 */
export async function findPublishedRules(req: PayloadRequest): Promise<Rule[]> {
	const { docs } = await req.payload.find({
		collection: 'rules',
		depth: 0,
		draft: false,
		limit: 2000,
		overrideAccess: !req.user,
		user: req.user,
		where: { _status: { equals: 'published' } },
	})
	return docs
}
