import { type ModelMessage, pruneMessages } from 'ai'
import type { getAgentTools } from '@/modules/agents/agent-chat-tools.agent'

/**
 * 이전 턴의 조회성 tool 결과와 reasoning을 이력에서 덜어낸다 — 클라이언트는 매 턴 대화 전체를 다시 보내고,
 * 루프는 그 이력을 스텝마다 다시 읽으므로 지난 턴에 읽은 가이드라인 본문이 턴×스텝만큼 반복 청구된다.
 *
 * 🔑 다시 부르면 같은 값이 나오는 조회만 지운다. 템플릿 후보·채운 템플릿·생성 이미지는 다음 턴이
 *    id로 이어받으므로("두 번째 걸로", "다시 만들어줘") 남긴다.
 * 🔴 첫 스텝의 입력(마지막이 새 user 메시지)에만 쓴다 — 진행 중인 턴의 tool 결과를 지우면 루프가 깨진다.
 */
const RE_FETCHABLE_TOOLS = [
	'loadSkill',
	'listGuidelineDocuments',
	'searchGuidelines',
	'readGuidelineDocument',
	'getCheckCatalog',
	'listCheckScenarios',
	'listImageProfiles',
] satisfies (keyof ReturnType<typeof getAgentTools>)[]

export function prunePriorTurns(messages: ModelMessage[]): ModelMessage[] {
	return pruneMessages({
		messages,
		reasoning: 'all',
		toolCalls: [{ type: 'all', tools: RE_FETCHABLE_TOOLS }],
	})
}
