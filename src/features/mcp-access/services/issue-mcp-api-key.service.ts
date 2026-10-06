import type { User } from '@/payload-types'
import {
	createMcpApiKeyRecord,
	findMcpApiKeyIssuedAt,
} from '../repositories/mcp-api-key.payload.repository'

/**
 * mcp-key route가 신규 MCP API 키를 발급하는 use case. 같은 계정의 이전 키는 폐기된다(교체).
 * Payload 저장은 mcp-api-key repository가 소유한다.
 */
export async function issueMcpApiKey(user: User): Promise<{ apiKey: string; id: number }> {
	return createMcpApiKeyRecord(user)
}

/** 계정 화면이 현재 키의 발급 시각을 읽는 use case. 키 값은 다시 보여 주지 않는다. */
export async function getMcpApiKeyIssuedAt(user: User): Promise<string | null> {
	return findMcpApiKeyIssuedAt(user)
}
