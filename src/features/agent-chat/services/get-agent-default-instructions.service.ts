import { getAgentSettings } from '../repositories/agent-settings.payload.repository'
import { agentDefaultInstructionSections } from '../utils/agent-default-instructions'

/**
 * Agent chat runtime에 공통 system prompt 섹션을 제공한다.
 * agent-settings 조회는 repository가 소유하고, 이 service는 섹션 조립만 한다.
 */
export async function getAgentDefaultInstructions(user: unknown): Promise<string> {
	const settings = await getAgentSettings(user)

	return agentDefaultInstructionSections
		.map((section) => {
			const value = settings[section.field]?.trim() || section.defaultValue
			return `<${section.tag}>\n${value}\n</${section.tag}>`
		})
		.join('\n\n')
}
