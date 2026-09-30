import config from '@payload-config'
import { getPayload } from 'payload'
import type { AgentDefaultInstructionValues } from '../utils/agent-default-instructions'

/**
 * agent-settings Global을 읽는다. 요청 사용자의 권한으로 조회한다(`overrideAccess: false`).
 *
 * 🔴 이 조회는 service 안에 있었다(2026-09-02까지). 「단일 조회뿐이라 repository를 두지 않는다」는
 *    주석이 붙어 있었는데, 크기가 아니라 **호출자가 mock할 수 있는가**가 기준이다 — service 안에
 *    있으면 단위 테스트가 Payload를 실제로 부팅한다(`getTemplateStudio`가 그렇게 CI를 죽였다).
 */
export async function getAgentSettings(user: unknown): Promise<AgentDefaultInstructionValues> {
	const payload = await getPayload({ config })
	return (await payload.findGlobal({
		slug: 'agent-settings',
		depth: 0,
		overrideAccess: false,
		user: user as never,
	})) as AgentDefaultInstructionValues
}
