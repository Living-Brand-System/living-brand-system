import config from '@payload-config'
import { getPayload } from 'payload'
import type { AiTokenLimit } from '@/payload-types'

/**
 * 전역 기본 한도. 계정별 설정은 `users`의 소유자인 auth(`findUserTokenLimits`)가 준다 —
 * 유효 한도 계산(`resolveTokenLimits`)은 service가 둘을 합쳐서 한다.
 */
export async function findDefaultTokenLimits(): Promise<AiTokenLimit> {
	const payload = await getPayload({ config })
	return payload.findGlobal({ slug: 'ai-token-limits', depth: 0, overrideAccess: true })
}
