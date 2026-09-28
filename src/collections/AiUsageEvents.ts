import type { Access, CollectionConfig } from 'payload'
import { isManager, managerOrAdmin } from '@/lib/auth'
import { AI_USAGE_FEATURES, AI_USAGE_STUDIOS } from '@/modules/ai-usage/ai-usage-catalog'

/**
 * 본인 기록만 보이게 하는 행 단위 read.
 * 🔴 필드 access는 boolean만 반환할 수 있어 행을 못 거른다 — 컬렉션 read가 Where를 돌려줘야 한다.
 * worker는 admin을 모르는 역할이므로, 이 제약은 /studio 사용량 페이지의 조회에도 그대로 걸린다.
 */
const ownEventsOrManager: Access = ({ req }) => {
	if (isManager(req.user)) return true
	const userId = (req.user as { id?: number | string } | null)?.id
	if (userId == null) return false
	return { createdBy: { equals: userId } }
}

/** 토큰 수 필드 — AI SDK가 돌려주는 값 그대로. provider가 안 채우면 비어 있다. */
const tokenField = (name: string, description: string) =>
	({
		name,
		type: 'number',
		admin: { step: 1, description },
	}) as const

export const AiUsageEvents: CollectionConfig = {
	slug: 'ai-usage-events',
	labels: {
		singular: 'AI 사용량',
		plural: 'AI 사용량',
	},
	access: {
		read: ownEventsOrManager,
		// 사용량을 위조하면 집계가 의미를 잃는다. 각 호출 경로의 service만 trusted write로 남긴다.
		create: () => false,
		// 실행 당시의 사실이라 사람이 고칠 것이 하나도 없다. 컬렉션 단위로 닫으므로 필드마다 잠그지 않는다.
		update: () => false,
		delete: managerOrAdmin,
	},
	admin: {
		group: '운영 기록',
		useAsTitle: 'model',
		defaultColumns: ['createdBy', 'feature', 'model', 'totalTokens', 'createdAt'],
		description: 'AI 호출 1회의 모델과 토큰 사용량입니다. 계정별 집계의 유일한 출처입니다.',
	},
	fields: [
		{
			// 🔴 required를 두지 않는다. FK가 `ON DELETE SET NULL`이므로 계정이 지워지면 이 값이
			//    비고, NOT NULL이면 Postgres가 그 DELETE 자체를 거부한다(2026-09-28 실측).
			//    비어 있는 행은 「삭제된 계정이 쓴 토큰」이고, 집계에서 빼지 않는다.
			name: 'createdBy',
			type: 'relationship',
			relationTo: 'users',
			index: true,
			admin: {
				position: 'sidebar',
				description: '호출 당시 인증된 사용자입니다. 계정이 삭제되면 비어 있습니다.',
			},
		},
		{
			name: 'feature',
			type: 'select',
			required: true,
			index: true,
			// 🔴 목록의 정본은 ai-usage-catalog다 — 여기에 베껴 적으면 화면과 갈라진다.
			options: [...AI_USAGE_FEATURES],
			admin: {
				description: 'AI를 호출한 기능입니다.',
			},
		},
		{
			// 어느 화면에서 들어온 호출인가. `feature`와 직교한다 — 같은 image-generation이
			// 이미지 스튜디오에서도, 에이전트 챗 도구에서도, MCP에서도 불린다.
			// 🔴 nullable이다. admin 미리보기처럼 스튜디오 밖에서 오는 호출이 실제로 있고,
			//    그것을 아무 스튜디오에 욱여넣으면 집계가 거짓이 된다.
			name: 'studio',
			type: 'select',
			index: true,
			options: [...AI_USAGE_STUDIOS],
			admin: {
				description:
					'AI를 호출한 스튜디오 화면입니다. 비어 있으면 스튜디오 밖에서 온 호출입니다.',
			},
		},
		{
			name: 'model',
			type: 'text',
			required: true,
			index: true,
			admin: {
				description: '호출한 모델 식별자입니다.',
			},
		},
		tokenField('inputTokens', '입력(프롬프트) 토큰 수입니다.'),
		tokenField('outputTokens', '출력 토큰 수입니다.'),
		tokenField('totalTokens', 'provider가 보고한 합계 토큰 수입니다.'),
		tokenField('cacheReadInputTokens', '캐시에서 읽은 입력 토큰 수입니다.'),
		tokenField('cacheWriteInputTokens', '캐시에 쓴 입력 토큰 수입니다.'),
		tokenField('reasoningTokens', '추론에 쓴 출력 토큰 수입니다.'),
		{
			// 작업 내용은 이미 각 기록 컬렉션에 있다 — 여기서는 그리로 이어 주기만 한다.
			name: 'source',
			type: 'relationship',
			relationTo: ['generated-images', 'check-sessions', 'agent-chat-sessions'],
			admin: {
				position: 'sidebar',
				description: '이 호출이 남긴 작업 기록입니다.',
			},
		},
	],
	timestamps: true,
}
