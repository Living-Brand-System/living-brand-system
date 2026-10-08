import type { PayloadRequest } from 'payload'

export interface ScenarioCheckKeys {
	id: number
	checkKeys: string[]
}

/** 삭제 가드가 key로 대조할 시나리오별 Check key 목록(초안 포함). */
export async function listScenarioCheckKeys(req: PayloadRequest): Promise<ScenarioCheckKeys[]> {
	const { docs } = await req.payload.find({
		collection: 'check-scenarios',
		depth: 0,
		draft: true,
		limit: 0,
		overrideAccess: !req.user,
		pagination: false,
		req,
		select: { checkKeys: true },
		...(req.user ? { user: req.user } : {}),
	})
	return docs.map((scenario) => ({
		id: scenario.id,
		checkKeys: Array.isArray(scenario.checkKeys)
			? scenario.checkKeys.filter((key): key is string => typeof key === 'string')
			: [],
	}))
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
