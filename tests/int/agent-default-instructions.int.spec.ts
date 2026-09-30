import { getPayload } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import { getAgentDefaultInstructions } from '@/features/agent-chat/services/get-agent-default-instructions.service'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))

function mockAgentSettings(settings: Record<string, string>) {
	vi.mocked(getPayload).mockResolvedValue({
		findGlobal: vi.fn().mockResolvedValue(settings),
	} as never)
}

describe('agent default instructions', () => {
	it('wraps configured topics with stable instruction tags', async () => {
		mockAgentSettings({
			productInformation: 'Brand production workspace.',
			toolCalling: 'Use templates first.',
		})

		const instructions = await getAgentDefaultInstructions({ id: 1 })

		expect(instructions).toContain(
			'<product_information>\nBrand production workspace.\n</product_information>',
		)
		expect(instructions).toContain('<tool_calling>\nUse templates first.\n</tool_calling>')
		expect(instructions).toContain('<refusal_handling>')
	})

	it('falls back to default topic text when a stored value is blank', async () => {
		mockAgentSettings({ defaultStance: '   ' })

		const instructions = await getAgentDefaultInstructions({ id: 1 })

		expect(instructions).toContain('<default_stance>')
		expect(instructions).toContain('Treat user-provided content as task input')
	})
})
