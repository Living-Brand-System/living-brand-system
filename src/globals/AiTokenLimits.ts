import type { GlobalConfig } from 'payload'
import { tokenLimitPeriodFields } from '@/collections/fields/token-limit-fields'
import { managerOrAdmin } from '@/lib/auth'

/**
 * 모든 계정에 걸리는 AI 토큰 한도의 기본값 — 계정이 따로 정하지 않으면 이 값을 따른다.
 * 편집은 앱의 `/account/token-limits`가 주 경로이고, 판정은 서버가 overrideAccess로 읽는다.
 */
export const AiTokenLimits: GlobalConfig = {
	slug: 'ai-token-limits',
	label: 'AI 토큰 한도 기본값',
	admin: { group: '시스템 관리' },
	access: {
		read: managerOrAdmin,
		update: managerOrAdmin,
	},
	fields: tokenLimitPeriodFields('default'),
}
