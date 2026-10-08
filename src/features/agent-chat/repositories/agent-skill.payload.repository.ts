import config from '@payload-config'
import { getPayload } from 'payload'

import type { AgentSkill } from '@/payload-types'

type AgentSkillSummary = Pick<AgentSkill, 'description' | 'name'>
export type AgentSkillDetail = Pick<AgentSkill, 'body' | 'description' | 'name' | 'references'>

export async function findEnabledAgentSkillSummaries(user: unknown): Promise<AgentSkillSummary[]> {
	const payload = await getPayload({ config })
	const result = await payload.find({
		collection: 'agent-skills',
		depth: 0,
		limit: 100,
		overrideAccess: false,
		sort: 'name',
		user: user as never,
		where: {
			enabled: {
				equals: true,
			},
		},
		select: {
			name: true,
			description: true,
		},
	})

	return result.docs
}

export async function findEnabledAgentSkillByName(
	user: unknown,
	name: string,
): Promise<AgentSkillDetail | null> {
	const payload = await getPayload({ config })
	const result = await payload.find({
		collection: 'agent-skills',
		depth: 0,
		limit: 1,
		overrideAccess: false,
		user: user as never,
		where: {
			and: [
				{
					name: {
						equals: name,
					},
				},
				{
					enabled: {
						equals: true,
					},
				},
			],
		},
		select: {
			name: true,
			description: true,
			body: true,
			references: true,
		},
	})

	return (result.docs[0] as AgentSkillDetail | undefined) ?? null
}
