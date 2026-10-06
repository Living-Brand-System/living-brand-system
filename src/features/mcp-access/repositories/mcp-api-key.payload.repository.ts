import { randomUUID } from 'node:crypto'
import config from '@payload-config'
import { getPayload } from 'payload'
import type { User } from '@/payload-types'
import { type McpToolName, mcpToolNames } from '../mcp-tool-names'

/** 새 MCP 키를 발급해 레코드 저장을 소유하고 Payload Local API에 사용자 접근 제어를 적용한다. */
export async function createMcpApiKeyRecord(user: User): Promise<{ apiKey: string; id: number }> {
	const apiKey = randomUUID()
	const payload = await getPayload({ config })
	const record = await payload.create({
		collection: 'payload-mcp-api-keys',
		data: {
			apiKey,
			enableAPIKey: true,
			label: 'Frontend MCP key',
			user: user.id,
			// grant 키는 mcp-tool-names의 도구 목록에서 파생된다 — 도구 추가 시 자동으로 함께 켜진다.
			'payload-mcp-tool': Object.fromEntries(
				mcpToolNames.map((name) => [name, true]),
			) as Record<McpToolName, true>,
		},
		depth: 0,
		overrideAccess: false,
		user,
	})

	// 🔑 재발급은 교체다 — 계정당 활성 키는 하나다. 키는 발급 때 한 번만 보여 주므로 잊은 사람은
	//    다시 발급하는데, 예전엔 옛 키를 폐기하지 않아 한 계정에 유효한 키가 17개 쌓였다(2026-10-06).
	// 🔴 새 키를 만든 **뒤에** 지운다 — 중간에 실패해도 키가 0개가 되지 않는다(최악은 옛 키가 남는 것).
	// overrideAccess: 키 삭제는 adminOnly다. 범위를 본인 키로 못박아 계정 삭제 훅(Users)과 같은 방식으로 지운다.
	await payload.delete({
		collection: 'payload-mcp-api-keys',
		overrideAccess: true,
		where: { and: [{ user: { equals: user.id } }, { id: { not_equals: record.id } }] },
	})

	return { apiKey, id: record.id }
}

/** 계정의 현재 MCP 키 발급 시각. 없으면 null — 화면이 「이미 키가 있다」를 말하는 데 쓴다. 키 값은 읽지 않는다. */
export async function findMcpApiKeyIssuedAt(user: User): Promise<string | null> {
	const payload = await getPayload({ config })
	const { docs } = await payload.find({
		collection: 'payload-mcp-api-keys',
		depth: 0,
		limit: 1,
		overrideAccess: true,
		select: { createdAt: true } as never,
		sort: '-createdAt',
		where: { user: { equals: user.id } },
	})
	return (docs[0] as { createdAt?: string } | undefined)?.createdAt ?? null
}
