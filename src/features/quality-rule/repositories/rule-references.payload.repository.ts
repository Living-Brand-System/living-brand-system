import type { PayloadRequest } from 'payload'
import { relationshipId } from '../relationship-id'

export interface RuleReferenceSources {
	documents: { id: number; ruleIds: number[] }[]
	scenarios: { id: number; checkKeys: string[] }[]
}

/** Rule 삭제 가드가 참조 여부를 판단할 문서·시나리오 데이터를 draft 포함으로 읽는다. */
export async function listRuleReferenceSources(req: PayloadRequest): Promise<RuleReferenceSources> {
	const readOptions = {
		depth: 0,
		draft: true,
		limit: 0,
		overrideAccess: !req.user,
		pagination: false as const,
		req,
		...(req.user ? { user: req.user } : {}),
	}
	const documents = await req.payload.find({
		...readOptions,
		collection: 'guideline-documents',
		select: { sections: { rules: true }, rules: true },
	})
	const scenarios = await req.payload.find({
		...readOptions,
		collection: 'check-scenarios',
		select: { checkKeys: true },
	})

	return {
		documents: documents.docs.map((document) => ({
			id: document.id,
			ruleIds: [
				...(document.rules ?? []),
				...(document.sections ?? []).flatMap((section) => section.rules ?? []),
			].flatMap((rule) => {
				const id = relationshipId(rule)
				return id === null ? [] : [id]
			}),
		})),
		scenarios: scenarios.docs.map((scenario) => ({
			id: scenario.id,
			checkKeys: Array.isArray(scenario.checkKeys)
				? scenario.checkKeys.filter((key): key is string => typeof key === 'string')
				: [],
		})),
	}
}

/** 삭제 가드가 대조할 Rule의 key를 읽는다. */
export async function getRuleKey(req: PayloadRequest, ruleId: number): Promise<string | null> {
	const rule = await req.payload.findByID({
		collection: 'rules',
		id: ruleId,
		depth: 0,
		disableErrors: true,
		draft: true,
		overrideAccess: !req.user,
		req,
		...(req.user ? { user: req.user } : {}),
	})

	return rule?.key ?? null
}
