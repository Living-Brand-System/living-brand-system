import config from '@payload-config'
import { getPayload } from 'payload'
import type { AiTokenLimit, User } from '@/payload-types'

/**
 * 한 계정의 한도 설정과 전역 기본값을 읽는다 — 유효 한도 계산(`resolveTokenLimits`)은 service가 한다.
 * 🔑 한도 필드는 본인에게도 숨겨져 있어 overrideAccess로 읽는다 — 누구의 것을 읽을지는 호출부가 정한다.
 */
export async function findTokenLimitSources(
	userId: number,
): Promise<{ account: User['tokenLimits']; defaults: AiTokenLimit }> {
	const payload = await getPayload({ config })
	const [account, defaults] = await Promise.all([
		payload.findByID({
			collection: 'users',
			id: userId,
			depth: 0,
			overrideAccess: true,
			select: { tokenLimits: true },
		}),
		payload.findGlobal({ slug: 'ai-token-limits', depth: 0, overrideAccess: true }),
	])
	return { account: account.tokenLimits, defaults }
}
