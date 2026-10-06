import type { GlobalConfig } from 'payload'
import { managerOrAdmin } from '@/lib/auth'
import { DEFAULT_TOKEN_LIMITS } from '@/modules/ai-usage/token-limit'

/**
 * 모든 계정에 걸리는 AI 토큰 한도의 기본값 — 계정이 칸을 비워 두면 이 값을 따른다.
 * 🔑 기본값에는 「제한 없음」이 없다(사용자 결정 2026-10-06). 무제한은 계정별 「한도 없음」으로만 준다.
 * 🔑 저장한 적이 없어도 LBS 기본값(`DEFAULT_TOKEN_LIMITS`)이 걸린다 — 판정과 이 필드의 기본값이 같은 상수를 읽는다.
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
	fields: [
		{
			name: 'daily',
			type: 'number',
			label: '일 한도 (한국 시간 0시 기준, 토큰)',
			required: true,
			min: 1,
			defaultValue: DEFAULT_TOKEN_LIMITS.daily,
		},
		{
			name: 'monthly',
			type: 'number',
			label: '월 한도 (토큰)',
			required: true,
			min: 1,
			defaultValue: DEFAULT_TOKEN_LIMITS.monthly,
		},
	],
}
